import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "../shared/db";
import { orderRef, orderCollectionRef } from "../shared/orderRefs";

// Validate payload
const ReturnRequestSchema = z.object({
  orderId: z.string().min(1).max(256),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().uuid(),
});

const ReminderSchema = z.object({
  orderId: z.string().min(1).max(256),
  reminderTime: z.string().trim().min(1).max(128).optional(),
});

const AcknowledgeDeliverySchema = z.object({
  orderId: z.string().min(1).max(256),
  feedback: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().uuid(),
});

export const getUserOrders = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    try {
      const snapshot = await orderCollectionRef(request.auth.uid).orderBy("createdAt", "desc").get();
      const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      return { success: true, orders };
    } catch (e) {
      throw new HttpsError("internal", "Failed to fetch orders");
    }
});

export const setOrderReminder = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    const input = ReminderSchema.safeParse(request.data);
    if (!input.success) throw new HttpsError("invalid-argument", "A valid order is required.");

    try {
      const orderRef2 = orderRef(request.auth.uid, input.data.orderId);
      await db.runTransaction(async (transaction) => {
        const order = await transaction.get(orderRef2);
        if (!order.exists || order.data()?.userId !== request.auth?.uid) {
          throw new HttpsError("not-found", "Order not found.");
        }
        transaction.update(orderRef2, {
          reminderSet: true,
          ...(input.data.reminderTime ? { reminderTime: input.data.reminderTime } : {}),
        });
      });
      return { success: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "Failed to set reminder");
    }
});

export const initiateOrderReturn = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const parsed = ReturnRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload");
    }
    const { orderId, reason, idempotencyKey } = parsed.data;

    try {
      // Use idempotencyKey as the doc ID in a subcollection to prevent duplicate returns
      const returnRef = db.collection("returns").doc();
      const idempotencyRef = db.collection("idempotency_keys").doc(`${request.auth.uid}_${idempotencyKey}`);
      const orderRef2 = orderRef(request.auth.uid, orderId);
      
      await db.runTransaction(async (t: any) => {
        const [keyDoc, orderDoc] = await Promise.all([t.get(idempotencyRef), t.get(orderRef2)]);
        if (keyDoc.exists) {
            return;
        }
        if (!orderDoc.exists || orderDoc.data()?.userId !== request.auth?.uid) {
            throw new HttpsError("not-found", "Order not found.");
        }
        const currentStatus = orderDoc.data()?.status;
        if (currentStatus === "RETURN_REQUESTED" || currentStatus === "RETURNED" || currentStatus === "CANCELLED") {
            throw new HttpsError("failed-precondition", "This order cannot start another return.");
        }
        t.set(idempotencyRef, { userId: request.auth?.uid, processedAt: new Date().toISOString() });

        t.set(returnRef, {
            orderId,
            reason,
            userId: request.auth?.uid,
            status: "initiated",
            createdAt: new Date().toISOString()
        });
        
        t.update(orderRef2, { status: "RETURN_REQUESTED", returnStatus: "REQUESTED", returnReason: reason });
      });

      return { success: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "Failed to initiate return");
    }
});

export const acknowledgeDelivery = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const input = AcknowledgeDeliverySchema.safeParse(request.data);
  if (!input.success) throw new HttpsError("invalid-argument", "A valid order is required.");

  const orderRef2 = orderRef(request.auth.uid, input.data.orderId);
  const requestRef = orderRef2.collection("deliveryAcknowledgements").doc(input.data.idempotencyKey);
  return db.runTransaction(async transaction => {
    const [order, priorRequest] = await Promise.all([transaction.get(orderRef2), transaction.get(requestRef)]);
    if (priorRequest.exists) return { success: true };
    if (!order.exists || order.data()?.userId !== request.auth?.uid) {
      throw new HttpsError("not-found", "Order not found.");
    }
    if (order.data()?.status !== "DELIVERED") {
      throw new HttpsError("failed-precondition", "This order has not been marked delivered yet.");
    }
    transaction.create(requestRef, {
      userId: request.auth?.uid,
      feedback: input.data.feedback ?? null,
      acknowledgedAt: new Date().toISOString(),
    });
    transaction.update(orderRef2, { deliveryAcknowledged: true });
    return { success: true };
  });
});
