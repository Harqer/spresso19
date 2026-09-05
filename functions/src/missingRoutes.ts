import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { z as genkitZ } from "genkit";
import { db } from "./shared/db";
import { ai } from "./ai/genkit";
import { GoogleGenAI } from "@google/genai";
import { parseReceiptPayload, ParsedReceiptSchema } from "./receiptParsing";
import { consumeBudget, withCache } from "./ai/costControls";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const SeasonalRequest = z.object({ season: z.string().min(1).max(32), location: z.string().max(120).optional() });

export const creatorAgentsMetadata = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const { value } = await withCache("referenceData", { templates: 1 }, async () => {
    const snapshot = await db.collection("creator_templates").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  });
  return { templates: value };
});

export const seasonalStyling = onCall({ enforceAppCheck: true, memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const parsed = SeasonalRequest.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "season is required.");
  const snapshot = await db.collection("curated_wardrobes").where("userId", "==", request.auth.uid).where("season", "==", parsed.data.season).get();
  return { outfits: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })), season: parsed.data.season };
});

export const updateUserProfile = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const profile = request.data?.profile ?? request.data;
  if (!profile || typeof profile !== "object") throw new HttpsError("invalid-argument", "Profile is required.");
  const allowed = {
    email: typeof profile.email === "string" ? profile.email : undefined,
    displayName: typeof profile.name === "string" ? profile.name : undefined,
    avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : undefined,
    themePreference: typeof profile.themePreference === "string" ? profile.themePreference : undefined,
    notificationsEnabled: typeof profile.notificationsEnabled === "boolean" ? profile.notificationsEnabled : undefined,
    emailAlertsEnabled: typeof profile.emailAlertsEnabled === "boolean" ? profile.emailAlertsEnabled : undefined,
  };
  await db.collection("users").doc(request.auth.uid).set({ ...allowed, updatedAt: new Date().toISOString() }, { merge: true });
  return { success: true };
});

export const generateRecipeBargainChef = onCall({ enforceAppCheck: true, memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const prompt = typeof request.data?.prompt === "string" ? request.data.prompt.trim() : "";
  const ingredients = Array.isArray(request.data?.ingredients) ? request.data.ingredients.filter((item: unknown): item is string => typeof item === "string") : [];
  if (!prompt) throw new HttpsError("invalid-argument", "prompt is required.");
  try {
    await consumeBudget(request.auth.uid, "research");
  } catch {
    throw new HttpsError("resource-exhausted", "Daily recipe generation limit reached. Try again tomorrow.");
  }
  try {
    const response = await ai.generate({
      prompt: `Create a budget-aware recipe. Request: ${prompt}. Ingredients on hand: ${ingredients.join(", ") || "none"}. Return JSON with title, servings, ingredients, steps, and estimatedTotal. Do not invent prices or product availability.`,
      output: { schema: genkitZ.object({ title: genkitZ.string(), servings: genkitZ.number(), ingredients: genkitZ.array(genkitZ.string()), steps: genkitZ.array(genkitZ.string()), estimatedTotal: genkitZ.number() }) },
    });
    return { result: response.output };
  } catch {
    throw new HttpsError("internal", "Recipe generation is unavailable.");
  }
});

export const parseReceipt = onCall({ enforceAppCheck: true, secrets: [geminiApiKey], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  let payload;
  try {
    payload = parseReceiptPayload(request.data);
  } catch (error) {
    throw new HttpsError("invalid-argument", error instanceof Error ? error.message : "Receipt image is invalid.");
  }
  const apiKey = geminiApiKey.value();
  if (!apiKey) throw new HttpsError("failed-precondition", "Receipt parsing is unavailable.");
  try {
    await consumeBudget(request.auth.uid, "search");
  } catch {
    throw new HttpsError("resource-exhausted", "Daily receipt parsing limit reached. Try again tomorrow.");
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ inlineData: { mimeType: payload.mimeType, data: payload.imageBase64 } }, {
        text: "Extract this receipt into JSON with merchantName, purchaseDate, currency, total, and items. Use null when unreadable. Never infer missing prices."
      }],
      config: { responseMimeType: "application/json" },
    } as any);
    const parsed = ParsedReceiptSchema.parse(JSON.parse(response.text || "{}"));
    await db.collection("users").doc(request.auth.uid).collection("receipts").doc(payload.requestId).set({
      ...parsed,
      requestId: payload.requestId,
      createdAt: new Date().toISOString(),
    }, { merge: true });
    return { success: true, requestId: payload.requestId, receipt: parsed };
  } catch (error) {
    console.error("Receipt parsing failed:", error);
    throw new HttpsError("internal", "Receipt parsing is temporarily unavailable.");
  }
});
