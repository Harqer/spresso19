import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { PubSub } from "@google-cloud/pubsub";

const stripePublishableKey = defineSecret("STRIPE_PUBLISHABLE_KEY");
const pubSubClient = new PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");

export const getStripeConfig = onCall({ secrets: [stripePublishableKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});

export const createStripeIntent = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    
    // Stripe SDK is not yet installed. Fail cleanly per the zero-mock policy.
    throw new HttpsError("unimplemented", "Stripe payment intents are not yet fully implemented.");
});

export const ingestInteraction = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    const { productId, action } = request.data || {};
    if (!productId || !action) throw new HttpsError("invalid-argument", "Missing params");
    const eventPayload = { userId: request.auth.uid, productId, action, timestamp: new Date().toISOString() };
    try {
        const messageId = await interactionsTopic.publishMessage({ data: Buffer.from(JSON.stringify(eventPayload)) });
        return { status: "202 Accepted", messageId };
    } catch (e) {
        throw new HttpsError("internal", "Failed to process interaction");
    }
});
