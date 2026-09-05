import { db } from "../shared/db";
import type { DiscoveredListing } from "../contracts/discoveredListing";
import { createCartListingSnapshot } from "./cartListingSnapshot";

export type AddListingToCartResult = {
  success: true;
  totalItems: number;
};

export async function addListingToCart(
  uid: string,
  listing: DiscoveredListing,
  quantity: number,
  idempotencyKey: string,
): Promise<AddListingToCartResult> {
  const cartRef = db.collection("carts").doc(uid);
  const requestRef = cartRef.collection("requests").doc(idempotencyKey);

  return db.runTransaction(async transaction => {
    const [cart, previousRequest] = await Promise.all([transaction.get(cartRef), transaction.get(requestRef)]);
    if (previousRequest.exists) return previousRequest.data() as AddListingToCartResult;

    const existingItems = Array.isArray(cart.data()?.items) ? [...cart.data()!.items] : [];
    const existingIndex = existingItems.findIndex(item => item?.id === listing.id);
    const nextQuantity = (existingIndex >= 0 ? Number(existingItems[existingIndex].quantity) : 0) + quantity;
    if (!Number.isInteger(nextQuantity) || nextQuantity > 25) {
      throw new Error("A cart item cannot exceed 25 units.");
    }
    if (existingIndex >= 0) {
      existingItems[existingIndex] = createCartListingSnapshot(listing, nextQuantity);
    } else {
      existingItems.push(createCartListingSnapshot(listing, quantity));
    }

    const result: AddListingToCartResult = {
      success: true,
      totalItems: existingItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    };
    transaction.set(cartRef, { userId: uid, items: existingItems, updatedAt: new Date().toISOString() }, { merge: true });
    transaction.create(requestRef, result);
    return result;
  });
}
