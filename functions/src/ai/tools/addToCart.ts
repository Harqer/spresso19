import { ai } from "../genkit";
import { z } from "genkit";
import { getFirestore } from "firebase-admin/firestore";
import { DiscoveredListingSchema } from "../../contracts/discoveredListing";
import { createCartListingSnapshot } from "../../cart/cartListingSnapshot";

export const addToCartTool = ai.defineTool(
  {
    name: "addToCart",
    description: "Adds a specific product to the user's shopping cart.",
    inputSchema: z.object({
      productId: z.string().describe("The ID of the product to add to the cart"),
      quantity: z.number().optional().default(1).describe("The number of items to add"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      cartTotal: z.number().optional(),
    }),
  },
  async ({ productId, quantity }, ctx) => {
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    const db = getFirestore();
    const listingDoc = await db.collection("discovered_listings").doc(productId).get();
    if (!listingDoc.exists) {
      throw new Error("The selected merchant listing is no longer available.");
    }
    const parsedListing = DiscoveredListingSchema.safeParse({ id: listingDoc.id, ...(listingDoc.data() || {}) });
    if (!parsedListing.success) {
      throw new Error("The selected merchant listing is invalid or incomplete.");
    }
    const cartRef = db.collection("carts").doc(uid);
    
    await db.runTransaction(async (transaction: any) => {
      const cartDoc = await transaction.get(cartRef);
      const data = cartDoc.exists ? cartDoc.data() : { items: [] };
      const items = Array.isArray(data?.items) ? [...data.items] : [];
      
      const existingItemIndex = items.findIndex((item: any) => item?.id === productId);
      const nextQuantity = (existingItemIndex >= 0 ? Number(items[existingItemIndex].quantity) : 0) + quantity;
      if (!Number.isInteger(nextQuantity) || nextQuantity > 25) {
        throw new Error("A cart item cannot exceed 25 units.");
      }
      if (existingItemIndex > -1) {
        items[existingItemIndex] = createCartListingSnapshot(parsedListing.data, nextQuantity);
      } else {
        items.push(createCartListingSnapshot(parsedListing.data, quantity));
      }
      
      transaction.set(cartRef, { items }, { merge: true });
    });
    
    return {
      success: true,
      message: `Successfully added ${quantity} item(s) to your cart.`,
      cartTotal: undefined,
    };
  }
);
