export * from "./orders";
export * from "./wardrobe";
export * from "./ai";
export * from "./payments";
export * from "./catalog";
export * from "./interactions";
export * from "./users";
import * as webhooks from "./webhooks";
export { webhooks };

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

export const generatePasskeyChallenge = onCall((request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to generate a challenge.");
    }
    const challenge = crypto.randomBytes(32).toString("base64url");
    return { challenge };
});

export const verifyPasskeyRegistration = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
    }
    const { responseJson, challenge } = request.data;
    try {
        const response = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: challenge,
            expectedOrigin: ["https://spresso.com", "android:apk-key-hash"],
            expectedRPID: "spresso.com",
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;
            const { db } = await import("./shared/db");
            // Persist the passkey to user profile
            await db.collection("users").doc(request.auth.uid).collection("passkeys").doc(credential.id).set({
                credentialId: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString("base64"),
                counter: credential.counter,
                createdAt: new Date().toISOString()
            });
        }

        return { success: verification.verified };
    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message };
    }
});
