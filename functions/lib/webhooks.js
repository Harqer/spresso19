"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        const { productId, shippingAddress, merchantUrl, userApprovedPaywall, biometricAuthorized } = paymentIntent.metadata || {};
        // Autonomous Kitesurf Trigger
        if (productId) {
            try {
                const kResult = await (0, kitesurfService_1.executeKitesurfPurchase)(productId, shippingAddress || "", paymentIntent.id, merchantUrl || undefined, userApprovedPaywall === 'true', biometricAuthorized === 'true');
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
    const { productId, quantity = 1, shippingAddress, merchantUrl, userApprovedPaywall = false, biometricAuthorized = false } = request.data || {};
    if (!productId) {
        throw new https_2.HttpsError("invalid-argument", "Missing productId");
    }
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require('./shared/db')));
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            throw new https_2.HttpsError('not-found', 'Product not found');
        }
        const product = productDoc.data();
        const amount = Math.round(((product === null || product === void 0 ? void 0 : product.price) || 0) * 100 * quantity);
        const stripe = new stripe_1.default(stripeSecretKey.value(), {
            apiVersion: '2025-01-27.acacia'
        });
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            metadata: {
                productId,
                quantity: quantity.toString(),
                shippingAddress,
                merchantUrl,
                userApprovedPaywall: userApprovedPaywall.toString(),
                biometricAuthorized: biometricAuthorized.toString()
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