"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareCryptoPurchaseTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const firestore_1 = require("firebase-admin/firestore");
exports.prepareCryptoPurchaseTool = genkit_1.ai.defineTool({
    name: "prepareCryptoPurchase",
    description: "Prepares an order for a product using USDC on Base. Requires user biometric confirmation before execution.",
    inputSchema: genkit_2.z.object({
        productId: genkit_2.z.string().describe("The ID of the product being purchased"),
        quantity: genkit_2.z.number().describe("The number of items to purchase"),
        totalAmount: genkit_2.z.number().describe("The total amount to pay in USDC"),
        shippingAddress: genkit_2.z.string().describe("The shipping address for the order"),
    }),
    outputSchema: genkit_2.z.object({
        success: genkit_2.z.boolean(),
        message: genkit_2.z.string(),
        orderId: genkit_2.z.string().optional(),
    }),
}, async ({ productId, quantity, totalAmount, shippingAddress }, ctx) => {
    var _a, _b;
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    console.log(`AI Agent preparing autonomous purchase for User ${uid}: ${quantity} of ${productId}`);
    try {
        // Record the pending order in the database
        const db = (0, firestore_1.getFirestore)();
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
    }
    catch (error) {
        console.error("Agentic Wallet Preparation Failed:", error);
        return {
            success: false,
            message: `Failed to prepare autonomous purchase: ${error.message}`
        };
    }
});
//# sourceMappingURL=prepareCryptoPurchase.js.map