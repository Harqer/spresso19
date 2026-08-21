import { ai } from "../genkit";
import { z } from "genkit";
import { getFirestore } from "firebase-admin/firestore";

export const prepareCryptoPurchaseTool = ai.defineTool(
  {
    name: "prepareCryptoPurchase",
    description: "Prepares an order for a product using USDC on Base. Requires user biometric confirmation before execution.",
    inputSchema: z.object({
      productId: z.string().describe("The ID of the product being purchased"),
      quantity: z.number().describe("The number of items to purchase"),
      totalAmount: z.number().describe("The total amount to pay in USDC"),
      shippingAddress: z.string().describe("The shipping address for the order"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      orderId: z.string().optional(),
    }),
  },
  async ({ productId, quantity, totalAmount, shippingAddress }, ctx) => {
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    console.log(`AI Agent preparing autonomous purchase for User ${uid}: ${quantity} of ${productId}`);
    
    try {
      // Record the pending order in the database
      const db = getFirestore();
      const orderRef = db.collection("orders").doc();
      
      const orderData = {
        productId,
        quantity,
        totalAmount,
        shippingAddress,
        deviceSource: "ai_agentic_wallet",
        paymentMethod: "Coinbase USDC (Base AgentKit)",
        userId: uid,
        createdAt: new Date().toISOString(),
        status: "PENDING_BIOMETRICS"
      };
      
      await orderRef.set(orderData);
      
      return {
        success: true,
        message: `Order prepared. You MUST output this EXACT markdown tag to the user to trigger their biometric confirmation: [BIOMETRIC_CHECKOUT:${orderRef.id}]`,
        orderId: orderRef.id
      };
    } catch (error: any) {
      console.error("Agentic Wallet Preparation Failed:", error);
      return {
        success: false,
        message: `Failed to prepare autonomous purchase: ${error.message}`
      };
    }
  }
);
