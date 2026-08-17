"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToCartTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const admin = __importStar(require("firebase-admin"));
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
    const db = admin.firestore();
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