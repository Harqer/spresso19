import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./shared/db";
import { logger } from "firebase-functions/v2";

export const initializeOnboarding = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to initialize onboarding.");
    }
    const { uid, interests } = request.data;
    
    if (uid !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Cannot initialize onboarding for another user.");
    }

    if (!Array.isArray(interests)) {
        throw new HttpsError("invalid-argument", "Interests must be an array.");
    }

    try {
        await db.collection("users").doc(uid).set({
            interests,
            onboardingCompleted: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        logger.info(`Onboarding completed for user ${uid}`);
        return { success: true };
    } catch (error: any) {
        logger.error(`Error in initializeOnboarding: ${error.message}`);
        throw new HttpsError("internal", error.message);
    }
});

export const connectCoinbaseWallet = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to connect wallet.");
    }
    const { address, network } = request.data;

    if (!address || typeof address !== 'string') {
        throw new HttpsError("invalid-argument", "Wallet address is required.");
    }

    try {
        await db.collection("users").doc(request.auth.uid).set({
            coinbaseWalletAddress: address,
            walletNetwork: network || 'base',
            walletConnectedAt: new Date().toISOString()
        }, { merge: true });
        logger.info(`Coinbase Wallet connected for user ${request.auth.uid}`);
        return { success: true };
    } catch (error: any) {
        logger.error(`Error connecting Coinbase wallet: ${error.message}`);
        throw new HttpsError("internal", error.message);
    }
});

export const deactivateAccount = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in to deactivate account.");
    
    const { uid } = request.auth;
    try {
        await db.collection("users").doc(uid).update({
            status: "DEACTIVATED",
            deactivatedAt: new Date().toISOString()
        });
        logger.info(`User ${uid} deactivated their account.`);
        return { success: true };
    } catch (error: any) {
        logger.error(`Failed to deactivate account for ${uid}: ${error.message}`);
        throw new HttpsError("internal", "Failed to deactivate account.");
    }
});

export const verifyEmailCredential = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    
    // Stub for email credential verification
    return { success: true, message: "Email credential verified." };
});

export const getUserProfile = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    
    try {
        const doc = await db.collection("users").doc(request.auth.uid).get();
        if (!doc.exists) {
            return {
                id: request.auth.uid,
                name: "New User",
                email: request.auth.token.email || "",
                avatarUrl: "",
                phone: "",
                themePreference: "SYSTEM",
                notificationsEnabled: true,
                emailAlertsEnabled: true
            };
        }
        const data = doc.data() || {};
        return {
            id: request.auth.uid,
            name: data.displayName || data.name || "",
            email: data.email || request.auth.token.email || "",
            avatarUrl: data.avatarUrl || "",
            phone: data.phone || "",
            themePreference: data.theme || "SYSTEM",
            notificationsEnabled: data.pushNotifications ?? true,
            emailAlertsEnabled: data.emailAlerts ?? true
        };
    } catch (error: any) {
        logger.error(`Error fetching profile: ${error.message}`);
        throw new HttpsError("internal", "Failed to fetch user profile.");
    }
});
