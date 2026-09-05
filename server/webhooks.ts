import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { getFirestore } from "firebase-admin/firestore";
import "./config/firebase";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Stripe Secret Manager bindings are required before the webhook server can start.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-01-27.acacia" as any,
});
const db = getFirestore();
const router = Router();

router.post("/", async (request: Request, response: Response) => {
  const signature = request.headers["stripe-signature"];
  if (typeof signature !== "string") {
    response.status(400).send("Missing signature");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(request.body, signature, stripeWebhookSecret);
  } catch (error: any) {
    console.error("Stripe webhook signature verification failed.", { error: error?.message });
    response.status(400).send("Invalid signature");
    return;
  }

  if (event.type !== "payment_intent.succeeded") {
    response.status(200).send("Ignored");
    return;
  }

  const eventRef = db.collection("stripe_webhook_events").doc(event.id);
  const processingState = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.data()?.status === "COMPLETED") {
      return "COMPLETED" as const;
    }
    const startedAtMs = existing.data()?.startedAtMs;
    if (
      existing.data()?.status === "PROCESSING" &&
      typeof startedAtMs === "number" &&
      Date.now() - startedAtMs < 10 * 60 * 1000
    ) {
      return "PROCESSING" as const;
    }
    transaction.set(eventRef, {
      status: "PROCESSING",
      paymentIntentId: (event.data.object as Stripe.PaymentIntent).id,
      startedAtMs: Date.now(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return "ACQUIRED" as const;
  });
  if (processingState === "COMPLETED") {
    response.status(200).send("Already processed");
    return;
  }
  if (processingState === "PROCESSING") {
    response.status(409).send("Processing in progress");
    return;
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const metadata = paymentIntent.metadata || {};
  const quantity = Number(metadata.quantity);
  if (!metadata.productId || !metadata.orderId || !metadata.userId || !Number.isInteger(quantity) || quantity <= 0) {
    await eventRef.set({ status: "IGNORED", updatedAt: new Date().toISOString() }, { merge: true });
    response.status(200).send("Unmanaged payment intent ignored");
    return;
  }

  try {
    const attemptRef = db.collection("purchaseAttempts").doc(metadata.orderId);
    const orderRef = db.collection("orders").doc(metadata.orderId);
    await db.runTransaction(async (transaction) => {
      const [attemptSnapshot, orderSnapshot] = await Promise.all([
        transaction.get(attemptRef),
        transaction.get(orderRef),
      ]);
      const attempt = attemptSnapshot.data();
      if (!attemptSnapshot.exists || attempt?.userId !== metadata.userId || attempt?.productId !== metadata.productId || attempt?.quantity !== quantity) {
        throw new Error("No matching reserved purchase was found.");
      }
      if (attempt.totalCents !== paymentIntent.amount || attempt.currency !== paymentIntent.currency) {
        throw new Error("The settled amount does not match the reserved purchase.");
      }
      if (!orderSnapshot.exists) {
        transaction.create(orderRef, {
          userId: metadata.userId,
          items: [{
            product: {
              id: metadata.productId,
              name: attempt.productName,
              image: attempt.productImage || "",
              price: attempt.unitPrice,
              currency: String(attempt.currency).toUpperCase(),
            },
            quantity,
          }],
          totalAmount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          status: "PROCESSING",
          paymentIntentId: paymentIntent.id,
          authorizationId: metadata.authorizationId || attempt.authorizationId,
          shippingAddress: attempt.shippingAddress,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      transaction.set(attemptRef, {
        status: "COMPLETED",
        orderId: orderRef.id,
        paymentIntentId: paymentIntent.id,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      transaction.set(eventRef, {
        status: "COMPLETED",
        orderId: orderRef.id,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });
    response.status(200).send("Completed");
  } catch (error: any) {
    console.error("Stripe order reconciliation failed; requesting retry.", {
      eventId: event.id,
      paymentIntentId: paymentIntent.id,
      error: error?.message,
    });
    await eventRef.set({ status: "FAILED", updatedAt: new Date().toISOString() }, { merge: true });
    response.status(500).send("Fulfillment failed");
  }
});

export const webhookRouter = router;
