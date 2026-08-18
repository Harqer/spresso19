import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { PubSub } from "@google-cloud/pubsub";
import Stripe from "stripe";

const stripePublishableKey = defineSecret("STRIPE_PUBLISHABLE_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const pubSubClient = new PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");

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

export const confirmPurchase = onCall({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    
    const { productId, quantity, token, address } = request.data || {};
    if (!productId || !token) throw new HttpsError("invalid-argument", "Missing params");
    
    // Simulate signature validation for the voice token from Meta Wearables
    if (!token.startsWith("KS_SIGN_ACC_")) {
        throw new HttpsError("permission-denied", "Invalid biometric signature");
    }

    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-07-29.dahlia" as any });

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
    } catch (e: any) {
        console.error("Stripe confirmation error:", e);
        throw new HttpsError("internal", e.message);
    }
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
