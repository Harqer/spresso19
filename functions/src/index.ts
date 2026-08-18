export * from "./orders";
export * from "./wardrobe";
export * from "./ai";
export * from "./payments";
export * from "./catalog";
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
        return { success: verification.verified };
    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message };
    }
});
