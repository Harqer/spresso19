"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeDelivery = exports.initiateOrderReturn = exports.setOrderReminder = exports.getUserOrders = void 0;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const db_1 = require("../shared/db");
const orderRefs_1 = require("../shared/orderRefs");
// Validate payload
const ReturnRequestSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1).max(256),
    reason: zod_1.z.string().trim().min(3).max(500),
    idempotencyKey: zod_1.z.string().uuid(),
});
const ReminderSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1).max(256),
    reminderTime: zod_1.z.string().trim().min(1).max(128).optional(),
});
const AcknowledgeDeliverySchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1).max(256),
    feedback: zod_1.z.string().trim().max(1000).optional(),
    idempotencyKey: zod_1.z.string().uuid(),
});
exports.getUserOrders = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await (0, orderRefs_1.orderCollectionRef)(request.auth.uid).orderBy("createdAt", "desc").get();
        const orders = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { success: true, orders };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch orders");
    }
});
exports.setOrderReminder = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const input = ReminderSchema.safeParse(request.data);
    if (!input.success)
        throw new https_1.HttpsError("invalid-argument", "A valid order is required.");
    try {
        const orderRef2 = (0, orderRefs_1.orderRef)(request.auth.uid, input.data.orderId);
        await db_1.db.runTransaction(async (transaction) => {
            var _a, _b;
            const order = await transaction.get(orderRef2);
            if (!order.exists || ((_a = order.data()) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid)) {
                throw new https_1.HttpsError("not-found", "Order not found.");
            }
            transaction.update(orderRef2, Object.assign({ reminderSet: true }, (input.data.reminderTime ? { reminderTime: input.data.reminderTime } : {})));
        });
        return { success: true };
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError("internal", "Failed to set reminder");
    }
});
exports.initiateOrderReturn = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
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
        const idempotencyRef = db_1.db.collection("idempotency_keys").doc(`${request.auth.uid}_${idempotencyKey}`);
        const orderRef2 = (0, orderRefs_1.orderRef)(request.auth.uid, orderId);
        await db_1.db.runTransaction(async (t) => {
            var _a, _b, _c, _d, _e;
            const [keyDoc, orderDoc] = await Promise.all([t.get(idempotencyRef), t.get(orderRef2)]);
            if (keyDoc.exists) {
                return;
            }
            if (!orderDoc.exists || ((_a = orderDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid)) {
                throw new https_1.HttpsError("not-found", "Order not found.");
            }
            const currentStatus = (_c = orderDoc.data()) === null || _c === void 0 ? void 0 : _c.status;
            if (currentStatus === "RETURN_REQUESTED" || currentStatus === "RETURNED" || currentStatus === "CANCELLED") {
                throw new https_1.HttpsError("failed-precondition", "This order cannot start another return.");
            }
            t.set(idempotencyRef, { userId: (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid, processedAt: new Date().toISOString() });
            t.set(returnRef, {
                orderId,
                reason,
                userId: (_e = request.auth) === null || _e === void 0 ? void 0 : _e.uid,
                status: "initiated",
                createdAt: new Date().toISOString()
            });
            t.update(orderRef2, { status: "RETURN_REQUESTED", returnStatus: "REQUESTED", returnReason: reason });
        });
        return { success: true };
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError("internal", "Failed to initiate return");
    }
});
exports.acknowledgeDelivery = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const input = AcknowledgeDeliverySchema.safeParse(request.data);
    if (!input.success)
        throw new https_1.HttpsError("invalid-argument", "A valid order is required.");
    const orderRef2 = (0, orderRefs_1.orderRef)(request.auth.uid, input.data.orderId);
    const requestRef = orderRef2.collection("deliveryAcknowledgements").doc(input.data.idempotencyKey);
    return db_1.db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d;
        var _e;
        const [order, priorRequest] = await Promise.all([transaction.get(orderRef2), transaction.get(requestRef)]);
        if (priorRequest.exists)
            return { success: true };
        if (!order.exists || ((_a = order.data()) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid)) {
            throw new https_1.HttpsError("not-found", "Order not found.");
        }
        if (((_c = order.data()) === null || _c === void 0 ? void 0 : _c.status) !== "DELIVERED") {
            throw new https_1.HttpsError("failed-precondition", "This order has not been marked delivered yet.");
        }
        transaction.create(requestRef, {
            userId: (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid,
            feedback: (_e = input.data.feedback) !== null && _e !== void 0 ? _e : null,
            acknowledgedAt: new Date().toISOString(),
        });
        transaction.update(orderRef2, { deliveryAcknowledged: true });
        return { success: true };
    });
});
//# sourceMappingURL=index.js.map