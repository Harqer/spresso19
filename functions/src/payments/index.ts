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

import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

const cdpApiKeyId = defineSecret("CDP_API_KEY_NAME");
const cdpApiKeySecret = defineSecret("CDP_API_KEY_PRIVATE_KEY");

export const executeBiometricPurchase = onCall({ secrets: [cdpApiKeyId, cdpApiKeySecret] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

    const { orderId, responseJson, challenge } = request.data;
    if (!orderId || !responseJson || !challenge) {
        throw new HttpsError("invalid-argument", "Missing parameters.");
    }

    try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new HttpsError("not-found", "Order not found.");
        }
        
        const orderData = orderSnap.data()!;
        if (orderData.userId !== request.auth.uid) {
            throw new HttpsError("permission-denied", "Order does not belong to this user.");
        }
        if (orderData.status !== "PENDING_BIOMETRICS") {
            throw new HttpsError("failed-precondition", "Order is not pending biometrics.");
        }

        const response = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
        
        // Fetch the user's passkey from DB
        const passkeysSnapshot = await db.collection("users").doc(request.auth.uid).collection("passkeys").where("credentialId", "==", response.id).get();
        if (passkeysSnapshot.empty) {
            throw new HttpsError("not-found", "Passkey not found for user.");
        }
        const passkeyData = passkeysSnapshot.docs[0].data();
        
        // 1. Verify Passkey authentication
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challenge,
            expectedOrigin: ["https://spresso.com", "android:apk-key-hash"],
            expectedRPID: "spresso.com",
            credential: {
                id: passkeyData.credentialId,
                publicKey: Buffer.from(passkeyData.publicKey, "base64"),
                counter: passkeyData.counter,
                transports: ["internal", "hybrid"]
            } as any // Use as any in case exact types differ slightly
        });

        if (!verification.verified) {
            throw new HttpsError("permission-denied", "Biometric verification failed.");
        }
        
        // Update counter
        await passkeysSnapshot.docs[0].ref.update({ counter: verification.authenticationInfo.newCounter });

        // 2. Initialize Agentic Wallet & Execute USDC transfer
        const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
            apiKeyId: cdpApiKeyId.value(),
            apiKeySecret: cdpApiKeySecret.value(),
            networkId: "base-mainnet"
        });

        // Dummy vendor address for the sake of the transaction
        const vendorAddress = "0x0000000000000000000000000000000000000000";
        
        // Assuming we would use an actionProvider for ERC20 transfers, but we can do a raw tx or mock the SDK usage
        // This is a placeholder representing the on-chain transfer logic
        console.log(`Agentic Wallet (${await walletProvider.getAddress()}): Executing ${orderData.totalAmount} USDC transfer to ${vendorAddress}`);

        // 3. Update Order Status
        await orderRef.update({
            status: "COMPLETED",
            transactionHash: "mock_tx_hash_" + Date.now(),
            completedAt: new Date().toISOString()
        });

        return {
            success: true,
            message: "Purchase executed successfully via Agentic Wallet."
        };
    } catch (e: any) {
        console.error("executeBiometricPurchase error:", e);
        throw new HttpsError("internal", e.message);
    }
});
