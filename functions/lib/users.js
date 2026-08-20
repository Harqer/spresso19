"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = exports.verifyEmailCredential = exports.deactivateAccount = exports.connectCoinbaseWallet = exports.initializeOnboarding = void 0;
const https_1 = require("firebase-functions/v2/https");
const db_1 = require("./shared/db");
const v2_1 = require("firebase-functions/v2");
exports.initializeOnboarding = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to initialize onboarding.");
    }
    const { uid, interests } = request.data;
    if (uid !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Cannot initialize onboarding for another user.");
    }
    if (!Array.isArray(interests)) {
        throw new https_1.HttpsError("invalid-argument", "Interests must be an array.");
    }
    try {
        await db_1.db.collection("users").doc(uid).set({
            interests,
            onboardingCompleted: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        v2_1.logger.info(`Onboarding completed for user ${uid}`);
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error(`Error in initializeOnboarding: ${error.message}`);
        throw new https_1.HttpsError("internal", error.message);
    }
});
exports.connectCoinbaseWallet = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to connect wallet.");
    }
    const { address, network } = request.data;
    if (!address || typeof address !== 'string') {
        throw new https_1.HttpsError("invalid-argument", "Wallet address is required.");
    }
    try {
        await db_1.db.collection("users").doc(request.auth.uid).set({
            coinbaseWalletAddress: address,
            walletNetwork: network || 'base',
            walletConnectedAt: new Date().toISOString()
        }, { merge: true });
        v2_1.logger.info(`Coinbase Wallet connected for user ${request.auth.uid}`);
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error(`Error connecting Coinbase wallet: ${error.message}`);
        throw new https_1.HttpsError("internal", error.message);
    }
});
exports.deactivateAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to deactivate account.");
    const { uid } = request.auth;
    try {
        await db_1.db.collection("users").doc(uid).update({
            status: "DEACTIVATED",
            deactivatedAt: new Date().toISOString()
        });
        v2_1.logger.info(`User ${uid} deactivated their account.`);
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error(`Failed to deactivate account for ${uid}: ${error.message}`);
        throw new https_1.HttpsError("internal", "Failed to deactivate account.");
    }
});
exports.verifyEmailCredential = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    // Stub for email credential verification
    return { success: true, message: "Email credential verified." };
});
exports.getUserProfile = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    try {
        const doc = await db_1.db.collection("users").doc(request.auth.uid).get();
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
            notificationsEnabled: (_a = data.pushNotifications) !== null && _a !== void 0 ? _a : true,
            emailAlertsEnabled: (_b = data.emailAlerts) !== null && _b !== void 0 ? _b : true
        };
    }
    catch (error) {
        v2_1.logger.error(`Error fetching profile: ${error.message}`);
        throw new https_1.HttpsError("internal", "Failed to fetch user profile.");
    }
});
//# sourceMappingURL=users.js.map