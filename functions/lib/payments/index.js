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
exports.generateGoogleWalletPassJwt = exports.confirmPurchase = exports.createStripeIntent = exports.getStripeConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const stripePublishableKey = (0, params_1.defineSecret)("STRIPE_PUBLISHABLE_KEY");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
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
const crypto = __importStar(require("crypto"));
const kitesurfService_1 = require("../kitesurfService");
const db_1 = require("../shared/db");
exports.confirmPurchase = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const { productId, quantity = 1, token, address } = request.data || {};
    if (!productId || !token)
        throw new https_1.HttpsError("invalid-argument", "Missing params");
    try {
        // 1. Decode and Verify Biometric Signature
        const decodedToken = Buffer.from(token, 'base64').toString('utf8');
        const biometricData = JSON.parse(decodedToken);
        const { payload, signature, publicKey } = biometricData;
        const verify = crypto.createVerify('SHA256');
        verify.update(payload);
        verify.end();
        const isSignatureValid = verify.verify(`-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`, signature, 'base64');
        if (!isSignatureValid) {
            throw new https_1.HttpsError("permission-denied", "Cryptographic biometric signature verification failed.");
        }
        // 2. Fetch Product & Calculate Amount
        const productDoc = await db_1.db.collection("products").doc(productId).get();
        if (!productDoc.exists)
            throw new https_1.HttpsError("not-found", "Product not found.");
        const product = productDoc.data();
        const totalCents = Math.round(product.price * 100 * quantity);
        const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: "2025-01-27.acacia" });
        // 3. Create & Confirm Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalCents,
            currency: "usd",
            payment_method: "pm_card_visa", // In production, this would be a real payment method ID from the user
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never"
            },
            metadata: {
                userId: request.auth.uid,
                productId,
                quantity: quantity.toString(),
                shippingAddress: address
            }
        });
        // 4. Trigger Kitesurf Fulfillment
        const kResult = await (0, kitesurfService_1.executeKitesurfPurchase)(productId, address, paymentIntent.id, product.merchantUrl, true, true);
        return {
            success: kResult.success,
            message: kResult.success ? "Purchase successful and fulfillment triggered." : "Payment succeeded but fulfillment failed.",
            order: {
                id: kResult.orderId,
                status: paymentIntent.status,
                vendorRef: kResult.vendorOrderRef
            }
        };
    }
    catch (e) {
        console.error("Purchase confirmation error:", e);
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError("internal", e.message);
    }
});
exports.generateGoogleWalletPassJwt = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    // In a real implementation, this signs a JWT with the Google Service Account credentials
    // allowing the client to add a boarding pass, event ticket, or loyalty card to Google Wallet.
    return {
        jwt: "mock.jwt.token.for.google.wallet",
        success: true
    };
});
//# sourceMappingURL=index.js.map