import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "../shared/db";

// Validate payload
const ReturnRequestSchema = z.object({
  orderId: z.string(),
  reason: z.string().optional(),
  idempotencyKey: z.string(),
});

export const getUserOrders = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    try {
      const snapshot = await db.collection("orders").where("userId", "==", request.auth.uid).get();
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, orders };
    } catch (e) {
      throw new HttpsError("internal", "Failed to fetch orders");
    }
});

export const setOrderReminder = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    const { orderId } = request.data || {};
    if (!orderId) throw new HttpsError("invalid-argument", "Missing orderId");

    try {
      await db.collection("orders").doc(orderId).update({ reminderSet: true });
      return { success: true };
    } catch (e) {
      throw new HttpsError("internal", "Failed to set reminder");
    }
});

export const initiateOrderReturn = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const parsed = ReturnRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload");
    }
    const { orderId, reason, idempotencyKey } = parsed.data;

    try {
      // Use idempotencyKey as the doc ID in a subcollection to prevent duplicate returns
      const returnRef = db.collection("returns").doc();
      const idempotencyRef = db.collection("idempotency_keys").doc(idempotencyKey);
      
      await db.runTransaction(async (t) => {
        const keyDoc = await t.get(idempotencyRef);
        if (keyDoc.exists) {
            // Already processed
            return;
        }
        t.set(idempotencyRef, { processedAt: new Date().toISOString() });

        t.set(returnRef, {
            orderId,
            reason: reason || "",
            userId: request.auth?.uid,
            status: "initiated",
            createdAt: new Date().toISOString()
        });
        
        const orderRef = db.collection("orders").doc(orderId);
        t.update(orderRef, { status: "returning" });
      });

      return { success: true };
    } catch (e) {
      throw new HttpsError("internal", "Failed to initiate return");
    }
});
