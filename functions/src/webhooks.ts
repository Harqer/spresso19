import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "./shared/db";
import { getMerchantQuote, MerchantQuoteError, type MerchantQuoteProvider } from "./payments/merchantQuote";
import { stageKitesurfListing, kitesurfSecrets } from "./kitesurfService";
import { createCartListingSnapshot } from "./cart/cartListingSnapshot";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const stripePublishableKey = defineSecret("STRIPE_PUBLISHABLE_KEY");

// Spresso-controlled checkout: the server owns price discovery, the user owns
// the decision. No client-supplied amount, currency, or merchant URL is ever
// trusted; every payment is priced from a fresh merchant quote observed at
// request time, confirmed by the user in the trusted UI, settled by Stripe,
// and reconciled server-side by the signed webhook.
const PrepareCheckoutSchema = z.object({
  listingId: z.string().min(1).max(256),
  quantity: z.number().int().positive().max(25),
  idempotencyKey: z.string().uuid(),
}).strict();

function customerMessage(code: MerchantQuoteError["code"]): string {
  switch (code) {
    case "invalid-observation":
      return "We couldn't verify the current merchant price for this item. Please try again in a moment.";
    case "stale-observation":
      return "The merchant price changed. Please confirm again to get a fresh quote.";
    case "unknown-price":
      return "This item is not currently purchasable. You can still view it at the merchant.";
  }
}

const kitesurfQuoteProvider: MerchantQuoteProvider = {
  async lookup(snapshot) {
    const staging = await stageKitesurfListing(
      { merchantUrl: snapshot.merchantUrl, name: snapshot.name },
      {},
    );
    if (staging.status !== "staged" || !staging.observedPrice) {
      throw new MerchantQuoteError(
        "unknown-price",
        `Merchant staging failed: ${staging.failureReason ?? "unknown"}`,
      );
    }
    return {
      listingId: snapshot.id,
      merchantUrl: staging.finalUrl ?? snapshot.merchantUrl,
      amount: staging.observedPrice.amount,
      currency: staging.observedPrice.currency,
      observedAt: new Date().toISOString(),
    };
  },
};

function stripeClient(): Stripe {
  return new Stripe(stripeSecretKey.value(), {
    apiVersion: "2025-01-27.acacia" as any,
  });
}

export const prepareCheckout = onCall(
  { enforceAppCheck: true, secrets: [stripeSecretKey, ...kitesurfSecrets], maxInstances: 20, minInstances: 0 },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "You must be signed in to checkout.");
    }
    const input = PrepareCheckoutSchema.safeParse(request.data);
    if (!input.success) {
      throw new HttpsError("invalid-argument", "A valid item and quantity are required.");
    }
    const { listingId, quantity, idempotencyKey } = input.data;
    const uid = request.auth.uid;

    // The cart snapshot is the single source of truth for what is being
    // purchased. The client never sends listing data, price, or currency.
    const cartRef = db.collection("carts").doc(uid);
    const attemptRef = db.collection("purchaseAttempts").doc(`${uid}_${idempotencyKey}`);

    try {
      const attempt = await db.runTransaction(async (transaction) => {
        const [cartDoc, priorAttempt] = await Promise.all([
          transaction.get(cartRef),
          transaction.get(attemptRef),
        ]);
        if (priorAttempt.exists) {
          const prior = priorAttempt.data();
          if (prior?.status === "PENDING" && prior?.clientSecret) {
            return prior;
          }
        }

        const items = Array.isArray(cartDoc.data()?.items) ? cartDoc.data()!.items : [];
        const snapshot = items.find((item: any) => item?.id === listingId);
        if (!snapshot) {
          throw new HttpsError("not-found", "That item is no longer in your cart.");
        }

        // The stored snapshot already carries the canonical listing metadata.
        const { quantity: _storedQuantity, addedAt: _storedAddedAt, ...storedListing } = snapshot;
        const cartSnapshot = createCartListingSnapshot(
          storedListing as Parameters<typeof createCartListingSnapshot>[0],
          quantity,
        );

        // Fresh price observation from the merchant at checkout time.
        const quote = await getMerchantQuote(cartSnapshot, kitesurfQuoteProvider);

        const stripe = stripeClient();
        const intent = await stripe.paymentIntents.create(
          {
            amount: quote.totalAmountCents,
            currency: quote.currency.toLowerCase(),
            automatic_payment_methods: { enabled: true },
            metadata: {
              userId: uid,
              listingId: quote.listingId,
              quantity: String(quantity),
              merchantUrl: quote.merchantUrl,
              idempotencyKey,
            },
          },
          { idempotencyKey: `prepare_${uid}_${idempotencyKey}` },
        );

        const record = {
          userId: uid,
          listingId: quote.listingId,
          listingName: cartSnapshot.name,
          quantity,
          currency: quote.currency,
          unitAmountCents: quote.unitAmountCents,
          totalCents: quote.totalAmountCents,
          merchantUrl: quote.merchantUrl,
          paymentIntentId: intent.id,
          clientSecret: intent.client_secret,
          status: "PENDING",
          quoteObservedAt: quote.observedAt,
          createdAt: new Date().toISOString(),
        };
        transaction.set(attemptRef, record);
        return record;
      });

      return {
        clientSecret: attempt.clientSecret,
        totalCents: attempt.totalCents,
        currency: attempt.currency,
        publishableKey: stripePublishableKey.value(),
      };
    } catch (error) {
      if (error instanceof MerchantQuoteError) {
        throw new HttpsError("failed-precondition", customerMessage(error.code));
      }
      if (error instanceof HttpsError) throw error;
      console.error("Checkout preparation failed", { error: error instanceof Error ? error.message : String(error) });
      throw new HttpsError("internal", "We couldn't start checkout. Please try again.");
    }
  },
);

// Orders are created only after Stripe confirms the payment via a signed
// webhook event; the client callback alone is never sufficient.
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret], maxInstances: 20, minInstances: 0 },
  async (request, response) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      response.status(400).send("Missing signature");
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = stripeClient();
      event = stripe.webhooks.constructEvent(request.rawBody, signature, stripeWebhookSecret.value());
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
    if (!metadata.userId || !metadata.listingId || !Number.isInteger(quantity) || quantity <= 0) {
      await eventRef.set({ status: "IGNORED", updatedAt: new Date().toISOString() }, { merge: true });
      response.status(200).send("Unmanaged payment intent ignored");
      return;
    }

    try {
      // The attempt id is recovered from the idempotency key carried in intent
      // metadata; unmanaged intents (no idempotency key) are never reconciled.
      const attemptId = metadata.idempotencyKey;
      if (typeof attemptId !== "string" || attemptId.length === 0) {
        throw new Error("Payment intent is missing checkout idempotency metadata.");
      }
      const attemptRef = db.collection("purchaseAttempts").doc(`${metadata.userId}_${attemptId}`);
      const attemptSnapshot = await attemptRef.get();
      const attempt = attemptSnapshot.data();
      if (!attemptSnapshot.exists || attempt?.paymentIntentId !== paymentIntent.id) {
        throw new Error("No matching checkout attempt was found.");
      }
      if (attempt.totalCents !== paymentIntent.amount || attempt.currency !== paymentIntent.currency.toUpperCase()) {
        throw new Error("The settled amount does not match the quoted purchase.");
      }

      const orderId = attempt.orderId || db.collection("orders").doc().id;
      const userOrderRef = db.collection("users").doc(metadata.userId).collection("orders").doc(orderId);

      await db.runTransaction(async (transaction) => {
        const existingOrder = await transaction.get(userOrderRef);
        if (existingOrder.exists) {
          transaction.set(attemptRef, {
            status: "COMPLETED",
            orderId: userOrderRef.id,
            paymentIntentId: paymentIntent.id,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          transaction.set(eventRef, {
            status: "COMPLETED",
            orderId: userOrderRef.id,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          return;
        }

        transaction.create(userOrderRef, {
          userId: metadata.userId,
          items: [{
            listingId: attempt.listingId,
            name: attempt.listingName || "Spresso order",
            merchantUrl: attempt.merchantUrl,
            unitAmountCents: attempt.unitAmountCents,
            quantity: attempt.quantity,
            currency: attempt.currency,
          }],
          totalAmount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          status: "PROCESSING",
          paymentIntentId: paymentIntent.id,
          merchantUrl: attempt.merchantUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        transaction.set(attemptRef, {
          status: "COMPLETED",
          orderId: userOrderRef.id,
          paymentIntentId: paymentIntent.id,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        transaction.set(eventRef, {
          status: "COMPLETED",
          orderId: userOrderRef.id,
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
  },
);
