"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addListingToCart = addListingToCart;
const db_1 = require("../shared/db");
const cartListingSnapshot_1 = require("./cartListingSnapshot");
async function addListingToCart(uid, listing, quantity, idempotencyKey) {
    const cartRef = db_1.db.collection("carts").doc(uid);
    const requestRef = cartRef.collection("requests").doc(idempotencyKey);
    return db_1.db.runTransaction(async (transaction) => {
        var _a;
        const [cart, previousRequest] = await Promise.all([transaction.get(cartRef), transaction.get(requestRef)]);
        if (previousRequest.exists)
            return previousRequest.data();
        const existingItems = Array.isArray((_a = cart.data()) === null || _a === void 0 ? void 0 : _a.items) ? [...cart.data().items] : [];
        const existingIndex = existingItems.findIndex(item => (item === null || item === void 0 ? void 0 : item.id) === listing.id);
        const nextQuantity = (existingIndex >= 0 ? Number(existingItems[existingIndex].quantity) : 0) + quantity;
        if (!Number.isInteger(nextQuantity) || nextQuantity > 25) {
            throw new Error("A cart item cannot exceed 25 units.");
        }
        if (existingIndex >= 0) {
            existingItems[existingIndex] = (0, cartListingSnapshot_1.createCartListingSnapshot)(listing, nextQuantity);
        }
        else {
            existingItems.push((0, cartListingSnapshot_1.createCartListingSnapshot)(listing, quantity));
        }
        const result = {
            success: true,
            totalItems: existingItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        };
        transaction.set(cartRef, { userId: uid, items: existingItems, updatedAt: new Date().toISOString() }, { merge: true });
        transaction.create(requestRef, result);
        return result;
    });
}
//# sourceMappingURL=addListingToCart.js.map