"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponseFromAudio = exports.lensSearch = exports.generateOutfit = exports.chatStream = exports.processSearchHistoryTelemetry = exports.logSearchHistory = exports.getQuickPrompts = exports.vitposeOrchestrateFit = exports.generateCreatorCampaign = exports.creatorAgentTemplates = exports.generateLiveApiToken = exports.discoverPersonalizedProducts = exports.analyzeUserBehavior = exports.generateSpin360 = exports.generateVirtualTryOn = void 0;
const https_1 = require("firebase-functions/v2/https");
const pubsub_1 = require("firebase-functions/v2/pubsub");
const pubsub_2 = require("@google-cloud/pubsub");
const params_1 = require("firebase-functions/params");
const node_crypto_1 = require("node:crypto");
const pubsub = new pubsub_2.PubSub();
const genai_1 = require("@google/genai");
const behavioralAnalysisFlow_1 = require("./flows/behavioralAnalysisFlow");
const discoverPersonalizedProductsFlow_1 = require("./flows/discoverPersonalizedProductsFlow");
const genkit_1 = require("./genkit");
require("./tools/addToCart");
require("./tools/searchProducts");
require("./tools/parallelWebSearch");
require("./tools/parallelDeepResearch");
require("./tools/chefAgent");
require("./tools/ecommerceAgent");
require("./tools/virtualTryOnAgent");
require("./tools/marketResearchUKAgent");
require("./tools/marketResearchUSAgent");
require("./tools/kitesurfSearch");
require("./tools/mediaGeneration");
const auth_1 = require("firebase-admin/auth");
const app_check_1 = require("firebase-admin/app-check");
const zod_1 = require("zod");
const mediaGeneration_1 = require("./mediaGeneration");
const costControls_1 = require("./costControls");
const modelRouting_1 = require("./modelRouting");
const parallel_web_1 = __importDefault(require("parallel-web"));
const parallelAdapter_1 = require("./providers/parallelAdapter");
const lensSearch_1 = require("./lensSearch");
const db_1 = require("../shared/db");
const virtualTryOnBoundary_1 = require("./virtualTryOnBoundary");
const virtualTryOnStorage_1 = require("./virtualTryOnStorage");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const higgsfieldKeyId = (0, params_1.defineSecret)("HIGGSFIELD_API_KEY_ID");
const higgsfieldKeySecret = (0, params_1.defineSecret)("HIGGSFIELD_KEY_SECRET");
const serpApiKey = (0, params_1.defineSecret)("SERPAPI_API_KEY");
const parallelApiKey = (0, params_1.defineSecret)("PARALLEL_API_KEY");
const cloudflareAccountId = (0, params_1.defineSecret)("CLOUDFLARE_ACCOUNT_ID");
const cloudflareApiToken = (0, params_1.defineSecret)("CLOUDFLARE_API_TOKEN");
const apifyApiToken = (0, params_1.defineSecret)("APIFY_API_TOKEN");
const mediaSecrets = [geminiApiKey, higgsfieldKeyId, higgsfieldKeySecret];
const shopperSecrets = [...mediaSecrets, serpApiKey, parallelApiKey, cloudflareAccountId, cloudflareApiToken];
exports.generateVirtualTryOn = (0, https_1.onCall)({ enforceAppCheck: true, secrets: mediaSecrets, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined)
        throw new https_1.HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    let data;
    try {
        data = (0, virtualTryOnBoundary_1.parseVirtualTryOnRequest)(request.data);
    }
    catch (_a) {
        throw new https_1.HttpsError("invalid-argument", "A valid virtual try-on request is required.");
    }
    const providerError = (0, virtualTryOnBoundary_1.providerAvailabilityError)({
        geminiApiKey: geminiApiKey.value(),
        higgsfieldKeyId: higgsfieldKeyId.value(),
        higgsfieldKeySecret: higgsfieldKeySecret.value(),
    });
    if (providerError)
        throw new https_1.HttpsError("failed-precondition", providerError);
    const jobId = data.idempotencyKey || (0, node_crypto_1.randomUUID)();
    const jobRef = db_1.db.collection("virtualTryOnJobs").doc(`${request.auth.uid}_${jobId}`);
    const startedAt = new Date().toISOString();
    try {
        await jobRef.create((0, virtualTryOnBoundary_1.createVirtualTryOnJobMetadata)({
            uid: request.auth.uid,
            jobId,
            mediaType: data.mediaType,
            status: "running",
            createdAt: startedAt,
        }));
    }
    catch (error) {
        if (data.idempotencyKey && (0, virtualTryOnBoundary_1.isAlreadyExistsError)(error)) {
            throw new https_1.HttpsError("already-exists", "This virtual try-on request has already been submitted.");
        }
        throw new https_1.HttpsError("internal", "Virtual try-on is unavailable right now. Please try again.");
    }
    try {
        const fitProfile = [
            typeof data.height === "string" ? `height ${data.height}` : "",
            typeof data.weight === "string" ? `weight ${data.weight}` : "",
            typeof data.size === "string" ? `usual size ${data.size}` : "",
            typeof data.fitPreference === "string" ? `preferred fit ${data.fitPreference}` : "",
            typeof data.fabric === "string" ? `fabric ${data.fabric}` : "",
        ].filter(Boolean).join(", ");
        const result = (0, virtualTryOnBoundary_1.parseVirtualTryOnResult)(await (0, mediaGeneration_1.generateMediaWithFallback)({
            prompt: `Photorealistic ${data.mediaType === "video" ? "short fashion motion clip" : "virtual try-on image"}. Show ${data.productName || data.productId || "the selected product"} on the person in the reference image. Preserve the person's identity, body proportions, pose, garment construction, color, texture, seams, and logo placement. Use the supplied fit profile only as a visual fitting guide: ${fitProfile || "no measurements supplied"}. Respect the garment's likely drape and fabric weight without inventing measurements. Show natural lighting, realistic contact shadows, and a clean composition. ${data.locationContext ? `Use a subtle, recognizable setting appropriate to the user's coarse location: ${data.locationContext}.` : "Use a neutral, softly lit setting."} ${data.customNotes || "Do not change the garment or body shape."}`,
            mediaType: data.mediaType,
            imageUrls: [data.productImage, data.userPhotoBase64].filter((value) => typeof value === "string" && value.startsWith("https://")),
            base64Images: [data.productImage, data.userPhotoBase64]
                .filter((value) => typeof value === "string" && value.startsWith("data:"))
                .map(value => { var _a; return ({ data: value, mimeType: ((_a = value.match(/^data:([^;]+);/)) === null || _a === void 0 ? void 0 : _a[1]) || "image/jpeg" }); }),
            requesterUid: request.auth.uid,
            geminiApiKey: geminiApiKey.value(),
            higgsfieldKeyId: higgsfieldKeyId.value(),
            higgsfieldKeySecret: higgsfieldKeySecret.value(),
            disableCache: true,
        }));
        const controlledMediaUrl = await (0, virtualTryOnStorage_1.persistGeneratedMedia)(request.auth.uid, jobId, result.mediaUrl);
        await jobRef.set((0, virtualTryOnBoundary_1.createVirtualTryOnJobMetadata)({
            uid: request.auth.uid,
            jobId,
            mediaType: result.mediaType,
            provider: result.provider,
            mediaUrl: controlledMediaUrl,
            status: "completed",
            createdAt: startedAt,
        }), { merge: true });
        return { tryOnMeta: Object.assign(Object.assign({}, result), { mediaUrl: controlledMediaUrl }), jobId };
    }
    catch (e) {
        await jobRef.set({ status: "failed", errorCode: "provider_failure", updatedAt: new Date().toISOString() }, { merge: true }).catch((metadataError) => {
            console.error("Virtual try-on job metadata update failed", metadataError instanceof Error ? metadataError.message : "unknown");
        });
        throw new https_1.HttpsError("internal", (0, virtualTryOnBoundary_1.safeVirtualTryOnError)(e));
    }
});
exports.generateSpin360 = (0, https_1.onCall)({ enforceAppCheck: true, secrets: mediaSecrets, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined)
        throw new https_1.HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const data = request.data || {};
        return await (0, mediaGeneration_1.generateMediaWithFallback)({
            prompt: `Photorealistic product presentation video with a smooth 360-degree rotation for ${data.name || data.productId || "the selected product"}. Keep the product centered and fully visible. Preserve exact shape, materials, texture, color, construction, and proportions. Use consistent studio-quality lighting, realistic shadows, stable camera motion, and no invented parts or text. ${data.category ? `Category: ${data.category}.` : ""} ${data.locationContext ? `Use a tasteful environment inspired by the user's coarse location: ${String(data.locationContext).slice(0, 120)}.` : "Use a neutral studio environment."}`,
            mediaType: "video",
            imageUrls: [data.image].filter((value) => typeof value === "string" && value.startsWith("http")),
            requesterUid: request.auth.uid,
            geminiApiKey: geminiApiKey.value(),
            higgsfieldKeyId: higgsfieldKeyId.value(),
            higgsfieldKeySecret: higgsfieldKeySecret.value(),
            cacheScope: "shared",
        });
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to run spin 360 flow");
    }
});
exports.analyzeUserBehavior = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey], maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    try {
        const result = await (0, behavioralAnalysisFlow_1.behavioralAnalysisFlow)(request.data);
        // We could also update the user's profile in Firestore here.
        // For now, we return the data to the client.
        return result;
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to run behavioral analysis flow");
    }
});
exports.discoverPersonalizedProducts = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey, parallelApiKey], maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    const configuredParallelApiKey = parallelApiKey.value();
    if (!configuredParallelApiKey) {
        throw new https_1.HttpsError("failed-precondition", "Product discovery is unavailable because PARALLEL_API_KEY is not configured for this environment.");
    }
    try {
        const queries = Array.isArray((_a = request.data) === null || _a === void 0 ? void 0 : _a.searchQueries) ? request.data.searchQueries.filter((q) => typeof q === "string" && Boolean(q.trim())).slice(0, 3) : [];
        if (queries.length === 0)
            throw new https_1.HttpsError("invalid-argument", "At least one search query is required.");
        const parallel = new parallel_web_1.default({ apiKey: configuredParallelApiKey });
        const research = await parallel.search({
            objective: `Find current merchant product listings for ${queries.join(", ")}. Return listing pages with title, merchant, price when shown, image when shown, and direct product URL. Do not claim inventory or availability.`,
            search_queries: queries,
            mode: "advanced",
            max_chars_total: 12000,
        });
        const providerListings = (0, parallelAdapter_1.normalizeParallelResults)(Array.isArray(research.results) ? research.results : []);
        const result = await (0, discoverPersonalizedProductsFlow_1.discoverPersonalizedProductsFlow)({ searchQueries: queries, requesterUid: request.auth.uid, providerListings });
        return result;
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to run discover personalized products flow");
    }
});
exports.generateLiveApiToken = (0, https_1.onCall)({ secrets: [geminiApiKey], enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to connect to Gemini Live.");
    }
    if (request.app == undefined) {
        throw new https_1.HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    }
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiApiKey.value()
            },
            body: JSON.stringify({
                uses: 1,
                liveConnectConstraints: {
                    model: "models/gemini-3.1-flash-live-preview",
                    config: {
                        responseModalities: ["AUDIO"],
                        sessionResumption: {}
                    }
                }
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to generate token: ${response.statusText}`);
        }
        const data = zod_1.z.object({ name: zod_1.z.string().min(1) }).parse(await response.json());
        return { token: data.name };
    }
    catch (error) {
        console.error("Token generation failed:", error);
        throw new https_1.HttpsError("internal", "Failed to generate ephemeral token");
    }
});
exports.creatorAgentTemplates = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require("../shared/db")));
        const snapshot = await db.collection("creator_templates").get();
        const templates = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { templates };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch creator agent templates");
    }
});
exports.generateCreatorCampaign = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { productName, campaignGoal, targetAudience } = request.data || {};
    if (!productName || !campaignGoal)
        throw new https_1.HttpsError("invalid-argument", "Missing required campaign parameters.");
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "research");
    }
    catch (_a) {
        throw new https_1.HttpsError("resource-exhausted", "Daily campaign generation limit reached. Try again tomorrow.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    const safetySettings = [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ];
    try {
        const response = await ai.interactions.create({
            safety_settings: safetySettings,
            model: "gemini-3.1-flash-lite-preview",
            input: `You are an expert marketing AI. Generate a creator campaign for the product "${productName}". The goal is "${campaignGoal}" and the target audience is "${targetAudience || 'General'}". Return ONLY a JSON object with this exact structure: {"campaignTitle": "...", "socialMediaCopy": "...", "suggestedTags": ["...", "..."]}`,
            response_mime_type: "application/json"
        });
        const responseText = response.output_text;
        if (!responseText)
            throw new Error("Empty response from Gemini");
        const parsed = JSON.parse(responseText);
        return { success: true, campaign: parsed };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", `Failed to generate campaign: ${e.message}`);
    }
});
exports.vitposeOrchestrateFit = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { imageBase64 } = request.data || {};
    if (!imageBase64)
        throw new https_1.HttpsError("invalid-argument", "Missing imageBase64");
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "media");
    }
    catch (_a) {
        throw new https_1.HttpsError("resource-exhausted", "Daily fit analysis limit reached. Try again tomorrow.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    const safetySettings = [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ];
    try {
        const response = await ai.interactions.create({
            safety_settings: safetySettings,
            model: "gemini-3.1-flash-lite-preview",
            input: [
                { type: "image", mime_type: "image/jpeg", data: imageBase64 },
                { type: "text", text: "Analyze this image for virtual try-on fit orchestration. Identify the key body regions and garment fit profile. Return ONLY a JSON object with this exact structure: {\"fitScore\": 0.0-100.0, \"garmentType\": \"...\", \"postureDetected\": \"...\", \"confidence\": 0.0-100.0}" }
            ],
            response_mime_type: "application/json"
        });
        const responseText = response.output_text;
        if (!responseText)
            throw new Error("Empty response from Gemini");
        const parsed = zod_1.z.object({
            fitScore: zod_1.z.number().min(0).max(100),
            garmentType: zod_1.z.string().min(1),
            postureDetected: zod_1.z.string().min(1),
            confidence: zod_1.z.number().min(0).max(100),
        }).parse(JSON.parse(responseText));
        return { success: true, fitAnalysis: parsed };
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError("internal", "Failed to orchestrate fit");
    }
});
exports.getQuickPrompts = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { value: prompts } = await (0, costControls_1.withCache)("referenceData", { quickPrompts: 1 }, async () => {
            const { db } = await Promise.resolve().then(() => __importStar(require("../shared/db")));
            const snapshot = await db.collection("quick_prompts").get();
            return snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        });
        return { prompts };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch quick prompts");
    }
});
exports.logSearchHistory = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    // Offload telemetry to Pub/Sub to decouple from the interactive critical path
    const topic = pubsub.topic("telemetry-search-history");
    await topic.publishMessage({ json: request.data || {} });
    return { success: true, queued: true };
});
exports.processSearchHistoryTelemetry = (0, pubsub_1.onMessagePublished)({ topic: "telemetry-search-history", maxInstances: 20 }, async (event) => {
    const data = event.data.message.json;
    console.log("Processing search history telemetry in background:", data);
});
exports.chatStream = (0, https_1.onRequest)({
    secrets: shopperSecrets,
    cors: ["https://get-spresso.web.app", "https://get-spresso.firebaseapp.com"],
    maxInstances: 20,
    minInstances: 0
}, async (req, res) => {
    var _a, e_1, _b, _c;
    // Only allow POST
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const appCheckToken = req.header("X-Firebase-AppCheck");
    if (!appCheckToken) {
        res.status(401).send("Unauthorized: Missing App Check token");
        return;
    }
    const authHeader = req.header("Authorization");
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")) || authHeader.slice("Bearer ".length).trim().length === 0) {
        res.status(401).send("Unauthorized");
        return;
    }
    let uid;
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(authHeader.slice("Bearer ".length));
        uid = decodedToken.uid;
    }
    catch (err) {
        console.error("Invalid auth token", err);
        res.status(401).send("Unauthorized");
        return;
    }
    try {
        await (0, app_check_1.getAppCheck)().verifyToken(appCheckToken);
    }
    catch (err) {
        res.status(401).send("Unauthorized: Invalid App Check token");
        return;
    }
    const input = zod_1.z.object({
        prompt: zod_1.z.string().trim().min(1).max(4000),
        locale: zod_1.z.string().trim().min(2).max(16).optional(),
        location: zod_1.z.string().trim().max(160).optional(),
    }).safeParse(req.body);
    if (!input.success) {
        res.status(400).send("Prompt is required.");
        return;
    }
    const { prompt, locale, location } = input.data;
    try {
        await (0, costControls_1.consumeBudget)(uid, "chat");
    }
    catch (_d) {
        res.status(429).send("Please try again later.");
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
        const shopperPrompt = genkit_1.ai.prompt("shopperPrompt");
        const { stream } = await shopperPrompt.stream({ userPrompt: prompt, locale: locale || "en", locationContext: location || "" }, {
            model: (0, modelRouting_1.selectShopperModel)(prompt),
            context: { auth: { uid } },
        });
        try {
            for (var _e = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = await stream_1.next(), _a = stream_1_1.done, !_a; _e = true) {
                _c = stream_1_1.value;
                _e = false;
                const chunk = _c;
                if (chunk.text) {
                    res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_e && !_a && (_b = stream_1.return)) await _b.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
    catch (err) {
        console.error("Stream error", err);
        res.write(`data: ${JSON.stringify({ text: "I couldn't complete that request. Please try again." })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
});
exports.generateOutfit = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0, concurrency: 1 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { items, weatherCondition, temperatureText, userLocation } = request.data || {};
    if (!items || items.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "No wardrobe items provided");
    }
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "outfit");
    }
    catch (e) {
        throw new https_1.HttpsError("resource-exhausted", "Daily outfit styling limit reached. Try again tomorrow.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    try {
        const prompt = `
You are a warm, high-end personal fashion stylist AI for the Spresso shopping assistant.
You speak like a thoughtful stylist friend: conversational, encouraging, practical, and specific.
User Location: ${userLocation || "Unknown"}
Weather: ${weatherCondition} - ${temperatureText}
Available Items (from User's Synchronized Photo Library / Closet):
${JSON.stringify(items.map((item) => ({ id: item.id, name: item.name, category: item.category, color: item.color, weather: item.weatherSuitability })), null, 2)}

Using 2-4 items from the available list that match the weather, recommend a premium, coherent outfit.
Write the styling advice the way a helpful stylist would, not like a spec list. Explain in plain, warm language WHY these pieces work together for the current weather, and touch on practicality (comfort, ease of getting dressed, silhouette).

Then give 2-4 short, conversational styling tips that are useful and informative (not generic filler). Ground them in the user's actual items where possible. These can cover layering for depth, elevated basics, body-shape fit, season-appropriate fabrics or colors, or footwear. Use a natural, friendly voice.

Return a JSON object with the following schema:
{
  "title": "string (Catchy, premium name for the outfit)",
  "stylingAdvice": "string (Warm, conversational advice explaining why these pieces from their closet work together for the weather, how to wear them, and how it flatters them)",
  "selectedItemIds": ["string (id of item 1)", "string (id of item 2)"],
  "weatherMatchScore": 95,
  "styleTips": ["string (conversational, useful styling tip)", "string (another tip)"]
}
`;
        const response = await ai.interactions.create({
            model: "gemini-3.1-flash-lite-preview",
            input: prompt,
            response_mime_type: "application/json",
            safety_settings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        });
        const responseText = response.output_text;
        if (!responseText)
            throw new Error("Empty response from Gemini");
        const parsed = JSON.parse(responseText);
        return { success: true, result: parsed };
    }
    catch (e) {
        console.error("AI Outfit error:", e);
        throw new https_1.HttpsError("internal", `Failed to generate outfit: ${e.message}`);
    }
});
exports.lensSearch = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [apifyApiToken], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const imageBase64 = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.imageBase64) === "string" ? request.data.imageBase64 : "";
    if (!imageBase64) {
        throw new https_1.HttpsError("invalid-argument", "No imageBase64 provided");
    }
    const configuredApifyApiToken = apifyApiToken.value();
    if (!configuredApifyApiToken) {
        throw new https_1.HttpsError("failed-precondition", "Visual search is unavailable because APIFY_API_TOKEN is not configured.");
    }
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "search");
    }
    catch (_b) {
        throw new https_1.HttpsError("resource-exhausted", "Daily visual search limit reached. Try again tomorrow.");
    }
    try {
        const { value: listings } = await (0, costControls_1.withCache)("productSearch", { imageBase64 }, () => (0, lensSearch_1.fetchApifyLensResults)(imageBase64, configuredApifyApiToken));
        return { success: true, listings };
    }
    catch (e) {
        console.error("Apify Lens error:", e);
        throw new https_1.HttpsError("internal", "Visual search is temporarily unavailable.");
    }
});
exports.generateResponseFromAudio = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey], memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, minInstances: 0 }, async (request) => {
    var _a, _b, _c, _d;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const prompt = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.prompt) === "string" && request.data.prompt.trim()
        ? request.data.prompt.trim().slice(0, 2000)
        : "Please analyze this audio.";
    const audioBase64 = typeof ((_b = request.data) === null || _b === void 0 ? void 0 : _b.audioBase64) === "string" ? request.data.audioBase64 : "";
    const mimeType = typeof ((_c = request.data) === null || _c === void 0 ? void 0 : _c.mimeType) === "string" && request.data.mimeType
        ? request.data.mimeType.slice(0, 100)
        : "audio/mpeg";
    if (!audioBase64 || !mimeType.startsWith("audio/")) {
        throw new https_1.HttpsError("invalid-argument", "Valid audio data is required.");
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(audioBase64)) {
        throw new https_1.HttpsError("invalid-argument", "Audio data must be base64 encoded.");
    }
    if (audioBase64.length > 8000000) {
        throw new https_1.HttpsError("invalid-argument", "Audio is too large. Keep the recording under two minutes.");
    }
    const apiKey = geminiApiKey.value();
    if (!apiKey)
        throw new https_1.HttpsError("failed-precondition", "Audio analysis is unavailable.");
    try {
        await (0, costControls_1.consumeBudget)(request.auth.uid, "search");
    }
    catch (_e) {
        throw new https_1.HttpsError("resource-exhausted", "Daily audio analysis limit reached. Try again tomorrow.");
    }
    try {
        const client = new genai_1.GoogleGenAI({ apiKey });
        const response = await client.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{ inlineData: { mimeType, data: audioBase64 } }, { text: prompt }],
        });
        const text = (_d = response.text) === null || _d === void 0 ? void 0 : _d.trim();
        if (!text)
            throw new Error("Empty response from Gemini");
        return { result: { text } };
    }
    catch (e) {
        console.error("Audio response generation failed:", e);
        throw new https_1.HttpsError("internal", "Audio analysis is temporarily unavailable.");
    }
});
//# sourceMappingURL=index.js.map