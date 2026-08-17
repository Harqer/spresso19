"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeIntent = exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const kitesurfService_1 = require("./kitesurfService");
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
exports.stripeWebhook = (0, https_1.onRequest)({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
    const stripe = new stripe_1.default(stripeSecretKey.value(), {
        apiVersion: '2025-01-27.acacia'
    });
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        res.status(400).send('Missing signature');
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    }
    catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { productId, shippingAddress, merchantUrl } = paymentIntent.metadata || {};
        // Autonomous Kitesurf Trigger
        if (productId) {
            try {
                const kResult = await (0, kitesurfService_1.executeKitesurfPurchase)(productId, shippingAddress || "123 Innovation Way, Tech District, SF", "", merchantUrl || "https://example.com", true, true);
                console.log("Kitesurf purchase triggered via webhook", kResult);
            }
            catch (err) {
                console.error("Failed to execute kitesurf on webhook:", err);
            }
        }
    }
    res.send();
});
const https_2 = require("firebase-functions/v2/https");
exports.createStripeIntent = (0, https_2.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) {
        throw new https_2.HttpsError("unauthenticated", "You must be signed in to checkout.");
    }
    try {
        const { productId, quantity, shippingAddress, merchantUrl } = request.data || {};
        if (!productId) {
            throw new https_2.HttpsError("invalid-argument", "Missing productId");
        }
        // Hardcoded amount for demo if not querying product DB
        const amount = 5000;
        const stripe = new stripe_1.default(stripeSecretKey.value(), {
            apiVersion: '2025-01-27.acacia'
        });
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            metadata: {
                productId,
                quantity: (quantity === null || quantity === void 0 ? void 0 : quantity.toString()) || '1',
                shippingAddress,
                merchantUrl
            }
        });
        return { clientSecret: paymentIntent.client_secret };
    }
    catch (err) {
        console.error("Failed to create stripe intent:", err);
        throw new https_2.HttpsError("internal", "Failed to create secure checkout session.");
    }
});
//# sourceMappingURL=webhooks.js.map