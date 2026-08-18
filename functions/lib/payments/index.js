"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestInteraction = exports.confirmPurchase = exports.createStripeIntent = exports.getStripeConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const pubsub_1 = require("@google-cloud/pubsub");
const stripe_1 = __importDefault(require("stripe"));
const stripePublishableKey = (0, params_1.defineSecret)("STRIPE_PUBLISHABLE_KEY");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const pubSubClient = new pubsub_1.PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");
exports.getStripeConfig = (0, https_1.onCall)({ secrets: [stripePublishableKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});
exports.createStripeIntent = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: "2026-07-29.dahlia" });
    const { amount, currency = "usd" } = request.data || {};
    if (!amount)
        throw new https_1.HttpsError("invalid-argument", "Amount is required");
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return { clientSecret: paymentIntent.client_secret };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", e.message);
    }
});
exports.confirmPurchase = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const { productId, quantity, token, address } = request.data || {};
    if (!productId || !token)
        throw new https_1.HttpsError("invalid-argument", "Missing params");
    // Simulate signature validation for the voice token from Meta Wearables
    if (!token.startsWith("KS_SIGN_ACC_")) {
        throw new https_1.HttpsError("permission-denied", "Invalid biometric signature");
    }
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: "2026-07-29.dahlia" });
    try {
        // Create a PaymentIntent and confirm it immediately using a test payment method
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 24000, // $240.00
            currency: "usd",
            payment_method: "pm_card_visa",
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never"
            },
            description: `Order for ${productId} x${quantity} shipped to ${address || 'default address'}`
        });
        return {
            success: true,
            order: {
                id: `ORD_${paymentIntent.id}`,
                status: paymentIntent.status
            }
        };
    }
    catch (e) {
        console.error("Stripe confirmation error:", e);
        throw new https_1.HttpsError("internal", e.message);
    }
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