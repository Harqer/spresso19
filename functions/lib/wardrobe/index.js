"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPreferences = exports.getUserPreferences = exports.toggleUserBookmark = exports.toggleUserLike = exports.getUserBookmarks = exports.getUserLikes = exports.curateWardrobe = void 0;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const db_1 = require("../shared/db");
const ToggleLikeSchema = zod_1.z.object({
    productId: zod_1.z.string(),
    idempotencyKey: zod_1.z.string(),
});
exports.curateWardrobe = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db_1.db.collection("curated_wardrobes").where("userId", "==", request.auth.uid).get();
        const curatedOutfits = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { curatedOutfits };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to curate wardrobe");
    }
});
exports.getUserLikes = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db_1.db.collection(`users/${request.auth.uid}/likes`).get();
        const likes = snapshot.docs.map((doc) => doc.id);
        return { likes };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch user likes");
    }
});
exports.getUserBookmarks = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db_1.db.collection(`users/${request.auth.uid}/bookmarks`).get();
        const bookmarks = snapshot.docs.map((doc) => doc.id);
        return { bookmarks };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch user bookmarks");
    }
});
exports.toggleUserLike = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const parsed = ToggleLikeSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid payload");
    }
    const { productId, idempotencyKey } = parsed.data;
    try {
        const likeRef = db_1.db.collection(`users/${request.auth.uid}/likes`).doc(productId);
        const idempotencyRef = db_1.db.collection("idempotency_keys").doc(idempotencyKey);
        await db_1.db.runTransaction(async (t) => {
            const keyDoc = await t.get(idempotencyRef);
            if (keyDoc.exists)
                return; // Already processed
            t.set(idempotencyRef, { processedAt: new Date().toISOString() });
            const likeDoc = await t.get(likeRef);
            if (likeDoc.exists) {
                t.delete(likeRef);
            }
            else {
                t.set(likeRef, { likedAt: new Date().toISOString() });
            }
        });
        return { success: true };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to toggle like");
    }
});
exports.toggleUserBookmark = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const parsed = ToggleLikeSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid payload");
    }
    const { productId, idempotencyKey } = parsed.data;
    try {
        const bookmarkRef = db_1.db.collection(`users/${request.auth.uid}/bookmarks`).doc(productId);
        const idempotencyRef = db_1.db.collection("idempotency_keys").doc(idempotencyKey);
        await db_1.db.runTransaction(async (t) => {
            const keyDoc = await t.get(idempotencyRef);
            if (keyDoc.exists)
                return; // Already processed
            t.set(idempotencyRef, { processedAt: new Date().toISOString() });
            const bookmarkDoc = await t.get(bookmarkRef);
            if (bookmarkDoc.exists) {
                t.delete(bookmarkRef);
            }
            else {
                t.set(bookmarkRef, { bookmarkedAt: new Date().toISOString() });
            }
        });
        return { success: true };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to toggle bookmark");
    }
});
exports.getUserPreferences = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const doc = await db_1.db.collection("user_preferences").doc(request.auth.uid).get();
        const data = doc.data() || {};
        return {
            bookmarkedIds: data.bookmarkedIds || [],
            likedIds: data.likedIds || [],
            searchInquiries: data.searchInquiries || []
        };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch user preferences");
    }
});
exports.updateUserPreferences = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const profileSchema = zod_1.z.object({
            usePersonalAvatar: zod_1.z.boolean(),
            avatarUrl: zod_1.z.string().url().max(2048).optional(),
            age: zod_1.z.number().int().min(13).max(120).optional(),
            height: zod_1.z.string().trim().max(32).optional(),
            weight: zod_1.z.string().trim().max(32).optional(),
            fitPreference: zod_1.z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
        });
        const input = zod_1.z.object({
            onboardingCompleted: zod_1.z.boolean().optional(),
            vibes: zod_1.z.array(zod_1.z.string().trim().min(1).max(80)).max(20).optional(),
            cardSaved: zod_1.z.boolean().optional(),
            wardrobeSynced: zod_1.z.boolean().optional(),
            radius: zod_1.z.number().int().min(1).max(100).optional(),
            locationEnabled: zod_1.z.boolean().optional(),
            avatarProfile: profileSchema.optional(),
        }).strict().safeParse(request.data);
        if (!input.success)
            throw new https_1.HttpsError("invalid-argument", "The preference details are invalid.");
        await db_1.db.collection("user_preferences").doc(request.auth.uid).set(input.data, { merge: true });
        if ((_a = input.data.avatarProfile) === null || _a === void 0 ? void 0 : _a.avatarUrl) {
            await db_1.db.collection("users").doc(request.auth.uid).set({ avatarUrl: input.data.avatarProfile.avatarUrl }, { merge: true });
        }
        return { success: true };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to update preferences");
    }
});
//# sourceMappingURL=index.js.map