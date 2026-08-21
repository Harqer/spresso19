import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "../shared/db";

const ToggleLikeSchema = z.object({
  productId: z.string(),
  idempotencyKey: z.string(),
});

export const curateWardrobe = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db.collection("curated_wardrobes").where("userId", "==", request.auth.uid).get();
        const curatedOutfits = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return { curatedOutfits };
    } catch (e) {
        throw new HttpsError("internal", "Failed to curate wardrobe");
    }
});

export const getUserLikes = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db.collection(`users/${request.auth.uid}/likes`).get();
        const likes = snapshot.docs.map((doc: any) => doc.id);
        return { likes };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch user likes");
    }
});

export const getUserBookmarks = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const snapshot = await db.collection(`users/${request.auth.uid}/bookmarks`).get();
        const bookmarks = snapshot.docs.map((doc: any) => doc.id);
        return { bookmarks };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch user bookmarks");
    }
});

export const toggleUserLike = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const parsed = ToggleLikeSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload");
    }
    const { productId, idempotencyKey } = parsed.data;

    try {
      const likeRef = db.collection(`users/${request.auth.uid}/likes`).doc(productId);
      const idempotencyRef = db.collection("idempotency_keys").doc(idempotencyKey);

      await db.runTransaction(async (t: any) => {
          const keyDoc = await t.get(idempotencyRef);
          if (keyDoc.exists) return; // Already processed
          t.set(idempotencyRef, { processedAt: new Date().toISOString() });

          const likeDoc = await t.get(likeRef);
          if (likeDoc.exists) {
              t.delete(likeRef);
          } else {
              t.set(likeRef, { likedAt: new Date().toISOString() });
          }
      });

      return { success: true };
    } catch (e) {
      throw new HttpsError("internal", "Failed to toggle like");
    }
});

export const toggleUserBookmark = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const parsed = ToggleLikeSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload");
    }
    const { productId, idempotencyKey } = parsed.data;

    try {
      const bookmarkRef = db.collection(`users/${request.auth.uid}/bookmarks`).doc(productId);
      const idempotencyRef = db.collection("idempotency_keys").doc(idempotencyKey);

      await db.runTransaction(async (t: any) => {
          const keyDoc = await t.get(idempotencyRef);
          if (keyDoc.exists) return; // Already processed
          t.set(idempotencyRef, { processedAt: new Date().toISOString() });

          const bookmarkDoc = await t.get(bookmarkRef);
          if (bookmarkDoc.exists) {
              t.delete(bookmarkRef);
          } else {
              t.set(bookmarkRef, { bookmarkedAt: new Date().toISOString() });
          }
      });

      return { success: true };
    } catch (e) {
      throw new HttpsError("internal", "Failed to toggle bookmark");
    }
});

export const getUserPreferences = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const doc = await db.collection("user_preferences").doc(request.auth.uid).get();
        const data = doc.data() || {};
        return { 
            bookmarkedIds: data.bookmarkedIds || [], 
            likedIds: data.likedIds || [], 
            searchInquiries: data.searchInquiries || [] 
        };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch user preferences");
    }
});

export const updateUserPreferences = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        await db.collection("user_preferences").doc(request.auth.uid).set(request.data, { merge: true });
        return { success: true };
    } catch (e) {
        throw new HttpsError("internal", "Failed to update preferences");
    }
});
