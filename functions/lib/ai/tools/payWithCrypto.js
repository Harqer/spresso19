"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payWithCryptoTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const agentkit_1 = require("@coinbase/agentkit");
const cdpApiKeyName = (0, params_1.defineSecret)("COINBASE_AGENTKIT_API_KEY");
const cdpApiKeyPrivate = (0, params_1.defineSecret)("COINBASE_WALLET_SECRET");
exports.payWithCryptoTool = genkit_1.ai.defineTool({
    name: "payWithCrypto",
    description: "Autonomously pays for a product or checkout using USDC on Base via Coinbase Agentic Wallet.",
    inputSchema: genkit_2.z.object({
        productId: genkit_2.z.string().describe("The ID of the product being purchased"),
        quantity: genkit_2.z.number().describe("The number of items to purchase"),
        totalAmount: genkit_2.z.number().describe("The total amount to pay in USDC"),
        shippingAddress: genkit_2.z.string().describe("The shipping address for the order"),
    }),
    outputSchema: genkit_2.z.object({
        success: genkit_2.z.boolean(),
        message: genkit_2.z.string(),
        transactionHash: genkit_2.z.string().optional(),
    }),
}, async ({ productId, quantity, totalAmount, shippingAddress }, ctx) => {
    var _a, _b;
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    console.log(`AI Agent initiating autonomous purchase for User ${uid}: ${quantity} of ${productId}`);
    try {
        // Configure CDP Wallet Provider using Google Secret Manager
        const walletProvider = await agentkit_1.CdpEvmWalletProvider.configureWithWallet({
            apiKeyId: cdpApiKeyName.value(),
            apiKeySecret: cdpApiKeyPrivate.value().replace(/\\n/g, "\n"),
            networkId: "base-sepolia",
        });
        const merchantAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Placeholder
        const amountStr = totalAmount.toString();
        console.log(`Executing native transfer (as a fallback) of ${amountStr} to ${merchantAddress}`);
        // nativeTransfer for now to fulfill the crypto purchase
        const hash = await walletProvider.nativeTransfer(merchantAddress, amountStr);
        console.log(`Transaction successful: ${hash}`);
        // Record the successful order in the database
        const db = (0, firestore_1.getFirestore)();
        const orderRef = db.collection("orders").doc();
        const orderData = {
            authorizationId: hash,
            productId,
            quantity,
            totalAmount,
            shippingAddress,
            deviceSource: "ai_agentic_wallet",
            paymentMethod: "Coinbase USDC (Base AgentKit)",
            userId: uid,
            createdAt: new Date().toISOString(),
            status: "COMPLETED"
        };
        await orderRef.set(orderData);
        // Also clear the user's cart if this was a cart checkout
        await db.collection("carts").doc(uid).delete();
        return {
            success: true,
            message: `Successfully paid ${amountStr} crypto and placed the order! Transaction Hash: ${hash}`,
            transactionHash: hash
        };
    }
    catch (error) {
        console.error("Agentic Wallet Purchase Failed:", error);
        return {
            success: false,
            message: `Failed to execute autonomous purchase: ${error.message}`
        };
    }
});
//# sourceMappingURL=payWithCrypto.js.map