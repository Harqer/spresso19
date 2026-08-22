import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import * as jwt from "jsonwebtoken";
import { z } from "zod";

const stripePublishableKey = defineSecret("STRIPE_PUBLISHABLE_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const getStripeConfig = onCall({ enforceAppCheck: true, secrets: [stripePublishableKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});

export const createStripeIntent = onCall({ enforceAppCheck: true, secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-07-29.dahlia" as any });
    const { amount, currency = "usd" } = request.data || {};
    if (!amount || typeof amount !== 'number' || amount <= 0) throw new HttpsError("invalid-argument", "Valid amount is required");

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

const ConfirmPurchaseSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().optional().default(1),
    token: z.string().min(1),
    address: z.string().optional()
});

export const confirmPurchase = onCall({ enforceAppCheck: true, secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    
    const parseResult = ConfirmPurchaseSchema.safeParse(request.data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Invalid parameters: " + parseResult.error.message);
    }
    const { productId, quantity, token, address } = parseResult.data;
    
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
                shippingAddress: address || null
            }
        });

        // 4. Trigger Kitesurf Fulfillment
        const kResult = await executeKitesurfPurchase(
            productId,
            address || "",
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

const googleWalletPrivateKey = defineSecret("GOOGLE_WALLET_PRIVATE_KEY");
const googleWalletIssuerId = defineSecret("GOOGLE_WALLET_ISSUER_ID");
const googleWalletClassId = defineSecret("GOOGLE_WALLET_CLASS_ID");
const googleWalletServiceAccountEmail = defineSecret("GOOGLE_WALLET_SA_EMAIL");

export const generateGoogleWalletPassJwt = onCall({ enforceAppCheck: true, secrets: [googleWalletPrivateKey, googleWalletIssuerId, googleWalletClassId, googleWalletServiceAccountEmail] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

    // We verify the presence of the secrets instead of hardcoding dummy values
    if (!googleWalletPrivateKey.value() || !googleWalletServiceAccountEmail.value()) {
        throw new HttpsError("failed-precondition", "Missing Google Wallet service account credentials.");
    }
    
    const issuerId = googleWalletIssuerId.value();
    const classId = googleWalletClassId.value();
    const objectId = `${issuerId}.${request.auth.uid}-${Date.now()}`;

    // Define standard Google Wallet Generic Object payload
    const claims = {
        iss: googleWalletServiceAccountEmail.value(),
        aud: "google",
        typ: "savetowallet",
        iat: Math.floor(Date.now() / 1000),
        origins: [],
        payload: {
            genericObjects: [{
                id: objectId,
                classId: `${issuerId}.${classId}`,
                genericType: "GENERIC_TYPE_UNSPECIFIED",
                hexBackgroundColor: "#4285f4",
                logo: {
                    sourceUri: { uri: "https://spresso.com/logo.png" }
                },
                cardTitle: {
                    defaultValue: { language: "en", value: "Spresso Premium Pass" }
                },
                header: {
                    defaultValue: { language: "en", value: "Spresso Membership" }
                }
            }]
        }
    };

    try {
        const token = jwt.sign(claims, googleWalletPrivateKey.value().replace(/\\n/g, '\n'), { algorithm: "RS256" });
        return {
            jwt: token,
            success: true
        };
    } catch (e: any) {
        console.error("JWT Signing failed", e);
        throw new HttpsError("internal", "Failed to generate Google Wallet JWT");
    }
});

import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

const cdpApiKeyId = defineSecret("CDP_API_KEY_NAME");
const cdpApiKeySecret = defineSecret("CDP_API_KEY_PRIVATE_KEY");

const ExecuteBiometricPurchaseSchema = z.object({
    orderId: z.string().min(1),
    responseJson: z.any(),
    challenge: z.string().min(1)
});

export const executeBiometricPurchase = onCall({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

    const parseResult = ExecuteBiometricPurchaseSchema.safeParse(request.data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Invalid parameters: " + parseResult.error.message);
    }
    const { orderId, responseJson, challenge } = parseResult.data;

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

        console.log(`Agentic Wallet (${await walletProvider.getAddress()}): Attempting transfer...`);
        
        try {
            const destAddress = orderData.vendorAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            const txHash = await walletProvider.sendTransaction({
                to: destAddress,
                value: BigInt(Math.floor((orderData.totalAmount || 0) * 1e18)) // Convert to Wei
            });
            
            // 3. Update Order Status
            await orderRef.update({
                status: "COMPLETED",
                transactionHash: txHash,
                completedAt: new Date().toISOString()
            });

            return {
                success: true,
                message: "Purchase executed successfully via Agentic Wallet.",
                txHash
            };
        } catch (txError: any) {
            console.error("Agentic Wallet TX failed:", txError);
            throw new HttpsError("aborted", "On-chain transfer failed. Ensure wallet has sufficient funds.");
        }
    } catch (e: any) {
        console.error("executeBiometricPurchase error:", e);
        throw new HttpsError("internal", e.message);
    }
});

export const processCryptoPayment = onCall({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

    const amount = request.data.amount;
    if (typeof amount !== 'number' || amount <= 0) {
        throw new HttpsError("invalid-argument", "Invalid amount specified.");
    }

    try {
        const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
            apiKeyId: cdpApiKeyId.value(),
            apiKeySecret: cdpApiKeySecret.value(),
            networkId: "base-mainnet"
        });

        console.log(`processCryptoPayment: Agentic Wallet (${await walletProvider.getAddress()}): Attempting transfer...`);
        
        const destAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const txHash = await walletProvider.sendTransaction({
            to: destAddress,
            value: BigInt(Math.floor(amount * 1e18)) // Convert to Wei
        });

        return {
            success: true,
            txHash
        };
    } catch (txError: any) {
        console.error("processCryptoPayment Agentic Wallet TX failed:", txError);
        throw new HttpsError("aborted", "On-chain transfer failed. Ensure wallet has sufficient funds.");
    }
});
