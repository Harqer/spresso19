import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "../shared/db";
import { DiscoveredListingSchema } from "../contracts/discoveredListing";
import { createCartListingSnapshot } from "./cartListingSnapshot";

const AddToCartSchema = z.object({
  listing: DiscoveredListingSchema,
  quantity: z.number().int().positive().max(25),
  idempotencyKey: z.string().uuid(),
}).strict();

export const addToCart = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to update your cart.");
  const input = AddToCartSchema.safeParse(request.data);
  if (!input.success) throw new HttpsError("invalid-argument", "A valid product and quantity are required.");

  const { listing, quantity, idempotencyKey } = input.data;
  const cartRef = db.collection("carts").doc(request.auth.uid);
  const requestRef = cartRef.collection("requests").doc(idempotencyKey);

  return db.runTransaction(async transaction => {
    const [cart, previousRequest] = await Promise.all([transaction.get(cartRef), transaction.get(requestRef)]);
    if (previousRequest.exists) return previousRequest.data();

    const existingItems = Array.isArray(cart.data()?.items) ? [...cart.data()!.items] : [];
    const existingIndex = existingItems.findIndex(item => item?.id === listing.id);
    const nextQuantity = (existingIndex >= 0 ? Number(existingItems[existingIndex].quantity) : 0) + quantity;
    if (!Number.isInteger(nextQuantity) || nextQuantity > 25) {
      throw new HttpsError("invalid-argument", "A cart item cannot exceed 25 units.");
    }
    if (existingIndex >= 0) {
      existingItems[existingIndex] = createCartListingSnapshot(listing, nextQuantity);
    } else {
      existingItems.push(createCartListingSnapshot(listing, quantity));
    }

    const result = {
      success: true,
      totalItems: existingItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    };
    transaction.set(cartRef, { userId: request.auth!.uid, items: existingItems, updatedAt: new Date().toISOString() }, { merge: true });
    transaction.create(requestRef, result);
    return result;
  });
});
