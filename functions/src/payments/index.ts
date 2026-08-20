import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

const stripePublishableKey = defineSecret("STRIPE_PUBLISHABLE_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const getStripeConfig = onCall({ secrets: [stripePublishableKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});

export const createStripeIntent = onCall({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-07-29.dahlia" as any });
    const { amount, currency = "usd" } = request.data || {};
    if (!amount) throw new HttpsError("invalid-argument", "Amount is required");

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return { clientSecret: paymentIntent.client_secret };
    } catch (e: any) {
        throw new HttpsError("internal", e.message);
    }
});

import * as crypto from "crypto";
import { executeKitesurfPurchase } from "../kitesurfService";
import { db } from "../shared/db";

export const confirmPurchase = onCall({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    
    const { productId, quantity = 1, token, address } = request.data || {};
    if (!productId || !token) throw new HttpsError("invalid-argument", "Missing params");
    
    try {
        // 1. Decode and Verify Biometric Signature
        const decodedToken = Buffer.from(token, 'base64').toString('utf8');
        const biometricData = JSON.parse(decodedToken);
        const { payload, signature, publicKey } = biometricData;

        const verify = crypto.createVerify('SHA256');
        verify.update(payload);
        verify.end();

        const isSignatureValid = verify.verify(
            `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
            signature,
            'base64'
        );

        if (!isSignatureValid) {
            throw new HttpsError("permission-denied", "Cryptographic biometric signature verification failed.");
        }

        // 2. Fetch Product & Calculate Amount
        const productDoc = await db.collection("products").doc(productId).get();
        if (!productDoc.exists) throw new HttpsError("not-found", "Product not found.");
        const product = productDoc.data()!;
        const totalCents = Math.round(product.price * 100 * quantity);

        const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2025-01-27.acacia" as any });

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
        const kResult = await executeKitesurfPurchase(
            productId,
            address,
            paymentIntent.id,
            product.merchantUrl,
            true,
            true
        );

        return { 
            success: kResult.success,
            message: kResult.success ? "Purchase successful and fulfillment triggered." : "Payment succeeded but fulfillment failed.",
            order: { 
                id: kResult.orderId,
                status: paymentIntent.status,
                vendorRef: kResult.vendorOrderRef
            } 
        };
    } catch (e: any) {
        console.error("Purchase confirmation error:", e);
        if (e instanceof HttpsError) throw e;
        throw new HttpsError("internal", e.message);
    }
});

export const generateGoogleWalletPassJwt = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    
    // In a real implementation, this signs a JWT with the Google Service Account credentials
    // allowing the client to add a boarding pass, event ticket, or loyalty card to Google Wallet.
    return {
        jwt: "mock.jwt.token.for.google.wallet",
        success: true
    };
});
