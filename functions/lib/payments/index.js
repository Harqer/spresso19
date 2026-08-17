"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestInteraction = exports.createStripeIntent = exports.getStripeConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const pubsub_1 = require("@google-cloud/pubsub");
const stripePublishableKey = (0, params_1.defineSecret)("STRIPE_PUBLISHABLE_KEY");
const pubSubClient = new pubsub_1.PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");
exports.getStripeConfig = (0, https_1.onCall)({ secrets: [stripePublishableKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});
exports.createStripeIntent = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    // Stripe SDK is not yet installed. Fail cleanly per the zero-mock policy.
    throw new https_1.HttpsError("unimplemented", "Stripe payment intents are not yet fully implemented.");
});
exports.ingestInteraction = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const { productId, action } = request.data || {};
    if (!productId || !action)
        throw new https_1.HttpsError("invalid-argument", "Missing params");
    const eventPayload = { userId: request.auth.uid, productId, action, timestamp: new Date().toISOString() };
    try {
        const messageId = await interactionsTopic.publishMessage({ data: Buffer.from(JSON.stringify(eventPayload)) });
        return { status: "202 Accepted", messageId };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to process interaction");
    }
});
//# sourceMappingURL=index.js.map