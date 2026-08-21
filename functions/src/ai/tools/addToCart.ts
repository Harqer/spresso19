import { ai } from "../genkit";
import { z } from "genkit";
import { getFirestore } from "firebase-admin/firestore";

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
    
    console.log(`User ${uid} adding ${quantity} of product ${productId} to cart`);
    
    const db = getFirestore();
    const cartRef = db.collection("carts").doc(uid);
    
    await db.runTransaction(async (transaction: any) => {
      const cartDoc = await transaction.get(cartRef);
      const data = cartDoc.exists ? cartDoc.data() : { items: [] };
      const items = data?.items || [];
      
      const existingItemIndex = items.findIndex((item: any) => item.productId === productId);
      if (existingItemIndex > -1) {
        items[existingItemIndex].quantity += quantity;
      } else {
        items.push({ productId, quantity, addedAt: new Date().toISOString() });
      }
      
      transaction.set(cartRef, { items }, { merge: true });
    });
    
    return {
      success: true,
      message: `Successfully added ${quantity} item(s) to your cart.`,
    };
  }
);
