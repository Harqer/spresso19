import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { z } from "zod";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const MerchantHandoffSchema = z.object({
  listingId: z.string().min(1).max(256).optional(),
  quantity: z.number().int().positive().max(25).optional(),
  idempotencyKey: z.string().uuid().optional(),
}).strict();

export const createCheckoutIntent = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "You must be signed in to checkout.");
    }
    if (!MerchantHandoffSchema.safeParse(request.data).success) {
      throw new HttpsError(
        "invalid-argument",
        "Merchant checkout does not accept client prices, currency, merchant URLs, or payment amounts.",
      );
    }
    throw new HttpsError(
      "failed-precondition",
      "Complete checkout on the merchant site. Spresso does not create merchant payment intents.",
    );
  },
);

// No merchant payment operation is approved while checkout remains
// user-completed. Verify Stripe signatures so invalid calls fail closed, then
// acknowledge the event without creating orders or financial references.
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      response.status(400).send("Missing signature");
      return;
    }

    try {
      const stripe = new Stripe(stripeSecretKey.value(), {
        apiVersion: "2025-01-27.acacia" as any,
      });
      stripe.webhooks.constructEvent(request.rawBody, signature, stripeWebhookSecret.value());
    } catch (error: any) {
      console.error("Stripe webhook signature verification failed.", { error: error?.message });
      response.status(400).send("Invalid signature");
      return;
    }

    response.status(200).send("Ignored: merchant checkout is user-completed");
  },
);
