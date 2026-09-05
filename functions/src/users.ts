import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./shared/db";
import { logger } from "firebase-functions/v2";
import { getAuth } from "firebase-admin/auth";
import { getDataConnect } from "firebase-admin/data-connect";
import { connectorConfig } from "./dataconnect";

const MAX_SENSITIVE_ACTION_AGE_SECONDS = 5 * 60;

const DELETE_DATA_CONNECT_USER_DATA = `
mutation DeleteSpressoUserData($uid: String!) {
  cartItems: cartItem_deleteMany(where: { cart: { userUid: { eq: $uid } } })
  carts: cart_deleteMany(where: { userUid: { eq: $uid } })
  itineraryEvents: itineraryEvent_deleteMany(where: { trip: { userId: { eq: $uid } } })
  travelExpenses: travelExpense_deleteMany(where: { userId: { eq: $uid } })
  voiceNotes: voiceNote_deleteMany(where: { userId: { eq: $uid } })
  trips: trip_deleteMany(where: { userId: { eq: $uid } })
  groceryItems: groceryListItem_deleteMany(where: { groceryList: { userId: { eq: $uid } } })
  groceryLists: groceryList_deleteMany(where: { userId: { eq: $uid } })
  orders: order_deleteMany(where: { userUid: { eq: $uid } })
  videos: video_deleteMany(where: { userUid: { eq: $uid } })
  likes: userLike_deleteMany(where: { userUid: { eq: $uid } })
  cookingSessions: activeCookingSession_deleteMany(where: { userId: { eq: $uid } })
  paymentMethods: paymentMethod_deleteMany(where: { userId: { eq: $uid } })
  subscriptions: userSubscription_deleteMany(where: { userId: { eq: $uid } })
  preferences: userPreference_deleteMany(where: { userId: { eq: $uid } })
  wardrobeItems: wardrobeItem_deleteMany(where: { userId: { eq: $uid } })
  wardrobeOutfits: wardrobeOutfit_deleteMany(where: { userId: { eq: $uid } })
  visionHistory: visionHistory_deleteMany(where: { userId: { eq: $uid } })
  onboarding: onboardingStatus_deleteMany(where: { userId: { eq: $uid } })
  wallets: coinbaseWallet_deleteMany(where: { userId: { eq: $uid } })
  user: user_delete(key: { id: $uid })
}`;

function requireRecentAuthentication(authTime: unknown): void {
    if (typeof authTime !== "number") {
        throw new HttpsError("failed-precondition", "Please sign in again before continuing.");
    }
    const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
    if (ageSeconds < 0 || ageSeconds > MAX_SENSITIVE_ACTION_AGE_SECONDS) {
        throw new HttpsError("failed-precondition", "Please sign in again before continuing.");
    }
}

async function deleteFirestoreUserData(uid: string): Promise<void> {
    const ownedQueries = [
        db.collection("returns").where("userId", "==", uid),
        db.collection("curated_wardrobes").where("userId", "==", uid),
        db.collection("logs").where("userId", "==", uid),
    ];

    for (const query of ownedQueries) {
        const snapshot = await query.get();
        await Promise.all(snapshot.docs.map((document) => db.recursiveDelete(document.ref)));
    }

    await Promise.all([
        db.recursiveDelete(db.collection("users").doc(uid).collection("orders")),
        db.recursiveDelete(db.collection("users").doc(uid)),
        db.recursiveDelete(db.collection("carts").doc(uid)),
        db.recursiveDelete(db.collection("user_preferences").doc(uid)),
    ]);
}

async function deleteDataConnectUserData(uid: string): Promise<void> {
    await getDataConnect(connectorConfig).executeGraphql<unknown, { uid: string }>(
        DELETE_DATA_CONNECT_USER_DATA,
        {
            operationName: "DeleteSpressoUserData",
            variables: { uid },
        },
    );
}

export const initializeOnboarding = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
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

export const connectCoinbaseWallet = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to connect wallet.");
    }
    const { address, network } = request.data;

    if (!address || typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new HttpsError("invalid-argument", "Wallet address is required.");
    }
    if (network !== undefined && network !== 'base' && network !== 'ethereum') {
        throw new HttpsError("invalid-argument", "Unsupported wallet network.");
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

export const deactivateAccount = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in to delete your account.");
    if (request.data?.confirm !== true) {
        throw new HttpsError("invalid-argument", "Account deletion must be explicitly confirmed.");
    }
    requireRecentAuthentication(request.auth.token.auth_time);

    const { uid } = request.auth;
    const deletionRef = db.collection("account_deletion_requests").doc(uid);
    try {
        await deletionRef.set({
            status: "PROCESSING",
            requestedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await deleteDataConnectUserData(uid);
        await deleteFirestoreUserData(uid);
        await getAuth().deleteUser(uid);
        await deletionRef.set({
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        logger.info("Account deletion completed.", { uid });
        return { success: true, status: "COMPLETED" };
    } catch (error: any) {
        await deletionRef.set({
            status: "FAILED",
            updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => undefined);
        logger.error("Account deletion failed before completion.", { uid, error: error?.message });
        throw new HttpsError("internal", "Unable to delete your account right now. Please try again.");
    }
});

export const verifyEmailCredential = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
    requireRecentAuthentication(request.auth.token.auth_time);
    if (request.auth.token.email_verified !== true || typeof request.auth.token.email !== "string") {
        throw new HttpsError("failed-precondition", "Verify your email address before continuing.");
    }
    return {
        success: true,
        email: request.auth.token.email,
        verifiedAt: new Date().toISOString(),
    };
});

export const getUserProfile = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
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
