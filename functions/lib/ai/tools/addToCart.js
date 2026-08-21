"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToCartTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const firestore_1 = require("firebase-admin/firestore");
exports.addToCartTool = genkit_1.ai.defineTool({
    name: "addToCart",
    description: "Adds a specific product to the user's shopping cart.",
    inputSchema: genkit_2.z.object({
        productId: genkit_2.z.string().describe("The ID of the product to add to the cart"),
        quantity: genkit_2.z.number().optional().default(1).describe("The number of items to add"),
    }),
    outputSchema: genkit_2.z.object({
        success: genkit_2.z.boolean(),
        message: genkit_2.z.string(),
        cartTotal: genkit_2.z.number().optional(),
    }),
}, async ({ productId, quantity }, ctx) => {
    var _a, _b;
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    console.log(`User ${uid} adding ${quantity} of product ${productId} to cart`);
    const db = (0, firestore_1.getFirestore)();
    const cartRef = db.collection("carts").doc(uid);
    await db.runTransaction(async (transaction) => {
        const cartDoc = await transaction.get(cartRef);
        const data = cartDoc.exists ? cartDoc.data() : { items: [] };
        const items = (data === null || data === void 0 ? void 0 : data.items) || [];
        const existingItemIndex = items.findIndex((item) => item.productId === productId);
        if (existingItemIndex > -1) {
            items[existingItemIndex].quantity += quantity;
        }
        else {
            items.push({ productId, quantity, addedAt: new Date().toISOString() });
        }
        transaction.set(cartRef, { items }, { merge: true });
    });
    return {
        success: true,
        message: `Successfully added ${quantity} item(s) to your cart.`,
    };
});
//# sourceMappingURL=addToCart.js.map