import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { createOperationalReads } from "./operationalReads";
import { db } from "./shared/db";

const callableOptions = { enforceAppCheck: true } as const;
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

const reads = createOperationalReads({
  async readCollection(path) {
    const snapshot = await db.collection(path).get();
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  },
  async readDocument(path) {
    const snapshot = await db.doc(path).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  },
});

function requireUid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

function readId(data: unknown, key: string): string {
  const value = z.object({ [key]: idSchema }).safeParse(data);
  if (!value.success) throw new HttpsError("invalid-argument", `A valid ${key} is required.`);
  return value.data[key];
}

export const getInventoryProxy = onCall(callableOptions, async (request) => {
  requireUid(request);
  throw new HttpsError(
    "failed-precondition",
    "Price and availability must be verified with the merchant before checkout.",
  );
});

export const getTravelTrips = onCall(callableOptions, async (request) => ({
  trips: await reads.getTravelTrips(requireUid(request)),
}));

export const getTravelEvents = onCall(callableOptions, async (request) => ({
  events: await reads.getTravelEvents(requireUid(request), readId(request.data, "tripId")),
}));

export const getTravelExpenses = onCall(callableOptions, async (request) => ({
  expenses: await reads.getTravelExpenses(requireUid(request), readId(request.data, "tripId")),
}));

export const getVoiceNotes = onCall(callableOptions, async (request) => ({
  voiceNotes: await reads.getVoiceNotes(requireUid(request), readId(request.data, "tripId")),
}));

export const getGroceryItems = onCall(callableOptions, async (request) => ({
  items: await reads.getGroceryItems(requireUid(request), readId(request.data, "listId")),
}));

export const getVisionDetection = onCall(callableOptions, async (request) => ({
  detection: await reads.getVisionDetection(requireUid(request), readId(request.data, "detectionId")),
}));

export const getSavedRecipe = onCall(callableOptions, async (request) => ({
  recipe: await reads.getSavedRecipe(requireUid(request), readId(request.data, "recipeId")),
}));

export const fetchProductsByIds = onCall(callableOptions, async (request) => {
  const uid = requireUid(request);
  const parsed = z.object({ ids: z.array(idSchema).min(1).max(50) }).safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "One or more valid product IDs are required.");

  const products = (
    await Promise.all(parsed.data.ids.map(async (id) => {
      const snapshot = await db.collection("discovered_listings").doc(id).get();
      if (!snapshot.exists) return null;
      const data = snapshot.data() ?? {};
      if (typeof data.userId === "string" && data.userId !== uid) return null;
      return { id: snapshot.id, ...data };
    }))
  ).filter((product): product is Record<string, unknown> & { id: string } => product !== null);

  return { products };
});
