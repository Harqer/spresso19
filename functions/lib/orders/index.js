"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateOrderReturn = exports.setOrderReminder = exports.getUserOrders = void 0;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const db_1 = require("../shared/db");
// Validate payload
const ReturnRequestSchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string(),
});
exports.getUserOrders = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db_1.db.collection("orders").where("userId", "==", request.auth.uid).get();
        const orders = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { success: true, orders };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch orders");
    }
});
exports.setOrderReminder = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { orderId } = request.data || {};
    if (!orderId)
        throw new https_1.HttpsError("invalid-argument", "Missing orderId");
    try {
        await db_1.db.collection("orders").doc(orderId).update({ reminderSet: true });
        return { success: true };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to set reminder");
    }
});
exports.initiateOrderReturn = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const parsed = ReturnRequestSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid payload");
    }
    const { orderId, reason, idempotencyKey } = parsed.data;
    try {
        // Use idempotencyKey as the doc ID in a subcollection to prevent duplicate returns
        const returnRef = db_1.db.collection("returns").doc();
        const idempotencyRef = db_1.db.collection("idempotency_keys").doc(idempotencyKey);
        await db_1.db.runTransaction(async (t) => {
            var _a;
            const keyDoc = await t.get(idempotencyRef);
            if (keyDoc.exists) {
                // Already processed
                return;
            }
            t.set(idempotencyRef, { processedAt: new Date().toISOString() });
            t.set(returnRef, {
                orderId,
                reason: reason || "",
                userId: (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid,
                status: "initiated",
                createdAt: new Date().toISOString()
            });
            const orderRef = db_1.db.collection("orders").doc(orderId);
            t.update(orderRef, { status: "returning" });
        });
        return { success: true };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to initiate return");
    }
});
//# sourceMappingURL=index.js.map