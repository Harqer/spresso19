"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReceipt = exports.generateRecipeBargainChef = exports.updateUserProfile = exports.seasonalStyling = exports.creatorAgentsMetadata = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const zod_1 = require("zod");
const genkit_1 = require("genkit");
const db_1 = require("./shared/db");
const genkit_2 = require("./ai/genkit");
const genai_1 = require("@google/genai");
const receiptParsing_1 = require("./receiptParsing");
const costControls_1 = require("./ai/costControls");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const SeasonalRequest = zod_1.z.object({ season: zod_1.z.string().min(1).max(32), location: zod_1.z.string().max(120).optional() });
exports.creatorAgentsMetadata = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { value } = await (0, costControls_1.withCache)("referenceData", { templates: 1 }, async () => {
        const snapshot = await db_1.db.collection("creator_templates").get();
        return snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    });
    return { templates: value };
});
exports.seasonalStyling = (0, https_1.onCall)({ enforceAppCheck: true, memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const parsed = SeasonalRequest.safeParse(request.data);
    if (!parsed.success)
        throw new https_1.HttpsError("invalid-argument", "season is required.");
    const snapshot = await db_1.db.collection("curated_wardrobes").where("userId", "==", request.auth.uid).where("season", "==", parsed.data.season).get();
    return { outfits: snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))), season: parsed.data.season };
});
exports.updateUserProfile = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    var _b;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const profile = (_b = (_a = request.data) === null || _a === void 0 ? void 0 : _a.profile) !== null && _b !== void 0 ? _b : request.data;
    if (!profile || typeof profile !== "object")
        throw new https_1.HttpsError("invalid-argument", "Profile is required.");
    const allowed = {
        email: typeof profile.email === "string" ? profile.email : undefined,
        displayName: typeof profile.name === "string" ? profile.name : undefined,
        avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : undefined,
        themePreference: typeof profile.themePreference === "string" ? profile.themePreference : undefined,
        notificationsEnabled: typeof profile.notificationsEnabled === "boolean" ? profile.notificationsEnabled : undefined,
        emailAlertsEnabled: typeof profile.emailAlertsEnabled === "boolean" ? profile.emailAlertsEnabled : undefined,
    };
    await db_1.db.collection("users").doc(request.auth.uid).set(Object.assign(Object.assign({}, allowed), { updatedAt: new Date().toISOString() }), { merge: true });
    return { success: true };
});
exports.generateRecipeBargainChef = (0, https_1.onCall)({ enforceAppCheck: true, memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const prompt = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.prompt) === "string" ? request.data.prompt.trim() : "";
    const ingredients = Array.isArray((_b = request.data) === null || _b === void 0 ? void 0 : _b.ingredients) ? request.data.ingredients.filter((item) => typeof item === "string") : [];
    if (!prompt)
        throw new https_1.HttpsError("invalid-argument", "prompt is required.");
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "research");
    }
    catch (_c) {
        throw new https_1.HttpsError("resource-exhausted", "Daily recipe generation limit reached. Try again tomorrow.");
    }
    try {
        const response = await genkit_2.ai.generate({
            prompt: `Create a budget-aware recipe. Request: ${prompt}. Ingredients on hand: ${ingredients.join(", ") || "none"}. Return JSON with title, servings, ingredients, steps, and estimatedTotal. Do not invent prices or product availability.`,
            output: { schema: genkit_1.z.object({ title: genkit_1.z.string(), servings: genkit_1.z.number(), ingredients: genkit_1.z.array(genkit_1.z.string()), steps: genkit_1.z.array(genkit_1.z.string()), estimatedTotal: genkit_1.z.number() }) },
        });
        return { result: response.output };
    }
    catch (_d) {
        throw new https_1.HttpsError("internal", "Recipe generation is unavailable.");
    }
});
exports.parseReceipt = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    let payload;
    try {
        payload = (0, receiptParsing_1.parseReceiptPayload)(request.data);
    }
    catch (error) {
        throw new https_1.HttpsError("invalid-argument", error instanceof Error ? error.message : "Receipt image is invalid.");
    }
    const apiKey = geminiApiKey.value();
    if (!apiKey)
        throw new https_1.HttpsError("failed-precondition", "Receipt parsing is unavailable.");
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "search");
    }
    catch (_a) {
        throw new https_1.HttpsError("resource-exhausted", "Daily receipt parsing limit reached. Try again tomorrow.");
    }
    try {
        const client = new genai_1.GoogleGenAI({ apiKey });
        const response = await client.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{ inlineData: { mimeType: payload.mimeType, data: payload.imageBase64 } }, {
                    text: "Extract this receipt into JSON with merchantName, purchaseDate, currency, total, and items. Use null when unreadable. Never infer missing prices."
                }],
            config: { responseMimeType: "application/json" },
        });
        const parsed = receiptParsing_1.ParsedReceiptSchema.parse(JSON.parse(response.text || "{}"));
        await db_1.db.collection("users").doc(request.auth.uid).collection("receipts").doc(payload.requestId).set(Object.assign(Object.assign({}, parsed), { requestId: payload.requestId, createdAt: new Date().toISOString() }), { merge: true });
        return { success: true, requestId: payload.requestId, receipt: parsed };
    }
    catch (error) {
        console.error("Receipt parsing failed:", error);
        throw new https_1.HttpsError("internal", "Receipt parsing is temporarily unavailable.");
    }
});
//# sourceMappingURL=missingRoutes.js.map