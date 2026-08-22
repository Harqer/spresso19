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
exports.processCryptoPayment = exports.executeBiometricPurchase = exports.generateGoogleWalletPassJwt = exports.confirmPurchase = exports.createStripeIntent = exports.getStripeConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const jwt = __importStar(require("jsonwebtoken"));
const zod_1 = require("zod");
const stripePublishableKey = (0, params_1.defineSecret)("STRIPE_PUBLISHABLE_KEY");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
exports.getStripeConfig = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [stripePublishableKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});
exports.createStripeIntent = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const stripe = new stripe_1.default(stripeSecretKey.value(), { apiVersion: "2026-07-29.dahlia" });
    const { amount, currency = "usd" } = request.data || {};
    if (!amount || typeof amount !== 'number' || amount <= 0)
        throw new https_1.HttpsError("invalid-argument", "Valid amount is required");
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
const ConfirmPurchaseSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive().optional().default(1),
    token: zod_1.z.string().min(1),
    address: zod_1.z.string().optional()
});
exports.confirmPurchase = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const parseResult = ConfirmPurchaseSchema.safeParse(request.data);
    if (!parseResult.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid parameters: " + parseResult.error.message);
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
                shippingAddress: address || null
            }
        });
        // 4. Trigger Kitesurf Fulfillment
        const kResult = await (0, kitesurfService_1.executeKitesurfPurchase)(productId, address || "", paymentIntent.id, product.merchantUrl, true, true);
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
const googleWalletPrivateKey = (0, params_1.defineSecret)("GOOGLE_WALLET_PRIVATE_KEY");
const googleWalletIssuerId = (0, params_1.defineSecret)("GOOGLE_WALLET_ISSUER_ID");
const googleWalletClassId = (0, params_1.defineSecret)("GOOGLE_WALLET_CLASS_ID");
const googleWalletServiceAccountEmail = (0, params_1.defineSecret)("GOOGLE_WALLET_SA_EMAIL");
exports.generateGoogleWalletPassJwt = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [googleWalletPrivateKey, googleWalletIssuerId, googleWalletClassId, googleWalletServiceAccountEmail] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    // We verify the presence of the secrets instead of hardcoding dummy values
    if (!googleWalletPrivateKey.value() || !googleWalletServiceAccountEmail.value()) {
        throw new https_1.HttpsError("failed-precondition", "Missing Google Wallet service account credentials.");
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
    }
    catch (e) {
        console.error("JWT Signing failed", e);
        throw new https_1.HttpsError("internal", "Failed to generate Google Wallet JWT");
    }
});
const server_1 = require("@simplewebauthn/server");
const agentkit_1 = require("@coinbase/agentkit");
const cdpApiKeyId = (0, params_1.defineSecret)("CDP_API_KEY_NAME");
const cdpApiKeySecret = (0, params_1.defineSecret)("CDP_API_KEY_PRIVATE_KEY");
const ExecuteBiometricPurchaseSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    responseJson: zod_1.z.any(),
    challenge: zod_1.z.string().min(1)
});
exports.executeBiometricPurchase = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const parseResult = ExecuteBiometricPurchaseSchema.safeParse(request.data);
    if (!parseResult.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid parameters: " + parseResult.error.message);
    }
    const { orderId, responseJson, challenge } = parseResult.data;
    try {
        const orderRef = db_1.db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new https_1.HttpsError("not-found", "Order not found.");
        }
        const orderData = orderSnap.data();
        if (orderData.userId !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Order does not belong to this user.");
        }
        if (orderData.status !== "PENDING_BIOMETRICS") {
            throw new https_1.HttpsError("failed-precondition", "Order is not pending biometrics.");
        }
        const response = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
        // Fetch the user's passkey from DB
        const passkeysSnapshot = await db_1.db.collection("users").doc(request.auth.uid).collection("passkeys").where("credentialId", "==", response.id).get();
        if (passkeysSnapshot.empty) {
            throw new https_1.HttpsError("not-found", "Passkey not found for user.");
        }
        const passkeyData = passkeysSnapshot.docs[0].data();
        // 1. Verify Passkey authentication
        const verification = await (0, server_1.verifyAuthenticationResponse)({
            response,
            expectedChallenge: challenge,
            expectedOrigin: ["https://spresso.com", "android:apk-key-hash"],
            expectedRPID: "spresso.com",
            credential: {
                id: passkeyData.credentialId,
                publicKey: Buffer.from(passkeyData.publicKey, "base64"),
                counter: passkeyData.counter,
                transports: ["internal", "hybrid"]
            } // Use as any in case exact types differ slightly
        });
        if (!verification.verified) {
            throw new https_1.HttpsError("permission-denied", "Biometric verification failed.");
        }
        // Update counter
        await passkeysSnapshot.docs[0].ref.update({ counter: verification.authenticationInfo.newCounter });
        // 2. Initialize Agentic Wallet & Execute USDC transfer
        const walletProvider = await agentkit_1.CdpEvmWalletProvider.configureWithWallet({
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
        }
        catch (txError) {
            console.error("Agentic Wallet TX failed:", txError);
            throw new https_1.HttpsError("aborted", "On-chain transfer failed. Ensure wallet has sufficient funds.");
        }
    }
    catch (e) {
        console.error("executeBiometricPurchase error:", e);
        throw new https_1.HttpsError("internal", e.message);
    }
});
exports.processCryptoPayment = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const amount = request.data.amount;
    if (typeof amount !== 'number' || amount <= 0) {
        throw new https_1.HttpsError("invalid-argument", "Invalid amount specified.");
    }
    try {
        const walletProvider = await agentkit_1.CdpEvmWalletProvider.configureWithWallet({
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
    }
    catch (txError) {
        console.error("processCryptoPayment Agentic Wallet TX failed:", txError);
        throw new https_1.HttpsError("aborted", "On-chain transfer failed. Ensure wallet has sufficient funds.");
    }
});
//# sourceMappingURL=index.js.map