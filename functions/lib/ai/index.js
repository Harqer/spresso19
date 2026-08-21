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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOutfit = exports.chatStream = exports.createCatalogCache = exports.processSearchHistoryTelemetry = exports.logSearchHistory = exports.getQuickPrompts = exports.vitposeOrchestrateFit = exports.generateCreatorCampaign = exports.creatorAgentTemplates = exports.identifyVisionObject = exports.generateLiveApiToken = exports.discoverPersonalizedProducts = exports.analyzeUserBehavior = exports.generateSpin360 = exports.generateVirtualTryOn = void 0;
const https_1 = require("firebase-functions/v2/https");
const pubsub_1 = require("firebase-functions/v2/pubsub");
const pubsub_2 = require("@google-cloud/pubsub");
const params_1 = require("firebase-functions/params");
const pubsub = new pubsub_2.PubSub();
const genai_1 = require("@google/genai");
const virtualTryOnFlow_1 = require("./flows/virtualTryOnFlow");
const spin360Flow_1 = require("./flows/spin360Flow");
const behavioralAnalysisFlow_1 = require("./flows/behavioralAnalysisFlow");
const discoverPersonalizedProductsFlow_1 = require("./flows/discoverPersonalizedProductsFlow");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
exports.generateVirtualTryOn = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined)
        throw new https_1.HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const result = await (0, virtualTryOnFlow_1.virtualTryOnFlow)(request.data);
        return result;
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to run virtual try-on flow");
    }
});
exports.generateSpin360 = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined)
        throw new https_1.HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const result = await (0, spin360Flow_1.spin360Flow)(request.data);
        return result;
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to run spin 360 flow");
    }
});
exports.analyzeUserBehavior = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
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
exports.discoverPersonalizedProducts = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    try {
        const result = await (0, discoverPersonalizedProductsFlow_1.discoverPersonalizedProductsFlow)(request.data);
        return result;
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to run discover personalized products flow");
    }
});
exports.generateLiveApiToken = (0, https_1.onCall)({ secrets: [geminiApiKey], enforceAppCheck: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to connect to Gemini Live.");
    }
    if (request.app == undefined) {
        throw new https_1.HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    }
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateEphemeralToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiApiKey.value()
            },
            body: JSON.stringify({
                ttl: "3600s"
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to generate token: ${response.statusText}`);
        }
        const data = await response.json();
        return { token: data.ephemeralToken };
    }
    catch (error) {
        console.error("Token generation failed:", error);
        throw new https_1.HttpsError("internal", "Failed to generate ephemeral token");
    }
});
exports.identifyVisionObject = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { imageBase64 } = request.data || {};
    if (!imageBase64)
        throw new https_1.HttpsError("invalid-argument", "Missing imageBase64");
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    const safetySettings = [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ];
    try {
        const response = await ai.interactions.create({
            model: "gemini-3.5-flash",
            input: [
                { type: "text", text: "Identify the primary product in this image. Respond with a JSON object containing the fields: 'productName' (string, short and clean name) and 'estimatedPrice' (number, reasonable estimate)." },
                { type: "image", mime_type: "image/jpeg", data: imageBase64 }
            ],
            response_mime_type: "application/json",
            safety_settings: safetySettings,
            tools: [{
                    name: "logProductDiscovery",
                    description: "Logs the newly discovered product from the visual search.",
                    parameters: {
                        type: "OBJECT",
                        properties: { productName: { type: "STRING" }, price: { type: "NUMBER" } },
                        required: ["productName", "price"]
                    }
                }],
            tool_config: { function_calling_config: { mode: "ANY" } }
        });
        let hudAnnotationText = "Unknown Item";
        let price = 0;
        if (response.functionCalls && response.functionCalls.length > 0) {
            const toolCall = response.functionCalls[0];
            if (toolCall.name === "logProductDiscovery" && toolCall.args) {
                hudAnnotationText = toolCall.args.productName;
                price = toolCall.args.price;
                console.log(`Multimodal Trigger: Logging discovery of ${hudAnnotationText} (${price})`);
                await pubsub.topic("telemetry-search-history").publishMessage({ json: { event: "vision_discovery", productName: hudAnnotationText, price, uid: request.auth.uid } });
            }
        }
        else {
            const text = response.output_text;
            if (!text)
                throw new Error("Empty response from Gemini");
            const json = JSON.parse(text);
            hudAnnotationText = json.productName || "Unknown Item";
            price = json.estimatedPrice || 0;
        }
        return {
            success: true,
            detectedResult: {
                hudAnnotationText,
                price
            }
        };
    }
    catch (e) {
        console.error("Vision API error:", e);
        throw new https_1.HttpsError("internal", "Failed to identify vision object");
    }
});
exports.creatorAgentTemplates = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require("../shared/db")));
        const snapshot = await db.collection("creator_templates").get();
        const templates = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { templates };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch creator agent templates");
    }
});
exports.generateCreatorCampaign = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { productName, campaignGoal, targetAudience } = request.data || {};
    if (!productName || !campaignGoal)
        throw new https_1.HttpsError("invalid-argument", "Missing required campaign parameters.");
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
            model: "gemini-3.5-flash",
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
exports.vitposeOrchestrateFit = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { imageBase64 } = request.data || {};
    if (!imageBase64)
        throw new https_1.HttpsError("invalid-argument", "Missing imageBase64");
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
            model: "gemini-3.5-flash",
            input: [
                { type: "image", mime_type: "image/jpeg", data: imageBase64 },
                { type: "text", text: "Analyze this image for virtual try-on fit orchestration. Identify the key body regions and garment fit profile. Return ONLY a JSON object with this exact structure: {\"fitScore\": 0.0-100.0, \"garmentType\": \"...\", \"postureDetected\": \"...\", \"confidence\": 0.0-100.0}" }
            ],
            response_mime_type: "application/json"
        });
        const responseText = response.output_text;
        if (!responseText)
            throw new Error("Empty response from Gemini");
        const parsed = JSON.parse(responseText);
        return { success: true, fitAnalysis: parsed };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", `Failed to orchestrate fit: ${e.message}`);
    }
});
exports.getQuickPrompts = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require("../shared/db")));
        const snapshot = await db.collection("quick_prompts").get();
        const prompts = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { prompts };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", "Failed to fetch quick prompts");
    }
});
exports.logSearchHistory = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    // Offload telemetry to Pub/Sub to decouple from the interactive critical path
    const topic = pubsub.topic("telemetry-search-history");
    await topic.publishMessage({ json: request.data || {} });
    return { success: true, queued: true };
});
exports.processSearchHistoryTelemetry = (0, pubsub_1.onMessagePublished)("telemetry-search-history", async (event) => {
    const data = event.data.message.json;
    console.log("Processing search history telemetry in background:", data);
});
exports.createCatalogCache = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require("../shared/db")));
        // Assume products collection holds the large catalog
        const snapshot = await db.collection("products").get();
        const catalog = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const catalogText = JSON.stringify(catalog);
        const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
        const cachedContent = await ai.caches.create({
            model: "gemini-3.5-flash",
            input: `Here is the full product catalog:\n${catalogText}`,
            ttl: "3600s" // Cache for 1 hour
        });
        return { success: true, cacheName: cachedContent.name, expireTime: cachedContent.expireTime };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", `Failed to create catalog cache: ${e.message}`);
    }
});
const admin = __importStar(require("firebase-admin"));
exports.chatStream = (0, https_1.onRequest)({ secrets: [geminiApiKey], cors: true }, async (req, res) => {
    var _a, e_1, _b, _c;
    var _d;
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
    try {
        await admin.appCheck().verifyToken(appCheckToken);
    }
    catch (err) {
        res.status(401).send("Unauthorized: Invalid App Check token");
        return;
    }
    const { prompt, cachedContentName } = req.body;
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
        const aiConfig = {
            model: "gemini-3.5-flash",
            input: prompt,
            system_instruction: "You are Spresso Personal Shopper. Keep it brief.",
            stream: true,
            safety_settings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ],
            tools: [
                { parallelAiSearch: {} },
                { googleMaps: { groundingTypes: { places: {}, routing: {} } } }
            ]
        };
        if (cachedContentName) {
            aiConfig.cachedContent = cachedContentName;
        }
        const responseStream = await ai.interactions.create(aiConfig);
        try {
            for (var _e = true, responseStream_1 = __asyncValues(responseStream), responseStream_1_1; responseStream_1_1 = await responseStream_1.next(), _a = responseStream_1_1.done, !_a; _e = true) {
                _c = responseStream_1_1.value;
                _e = false;
                const event = _c;
                if (event.event_type === "step.delta" && ((_d = event.delta) === null || _d === void 0 ? void 0 : _d.type) === "text") {
                    res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_e && !_a && (_b = responseStream_1.return)) await _b.call(responseStream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
    catch (err) {
        console.error("Stream error", err);
        res.write(`data: ${JSON.stringify({ text: "Error connecting to AI." })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
});
exports.generateOutfit = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    const { items, weatherCondition, temperatureText, userLocation } = request.data || {};
    if (!items || items.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "No wardrobe items provided");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    try {
        const prompt = `
You are a personal fashion stylist AI.
User Location: ${userLocation || "Unknown"}
Weather: ${weatherCondition} - ${temperatureText}
Available Items:
${JSON.stringify(items.map((item) => ({ id: item.id, name: item.name, category: item.category, color: item.color, weather: item.weatherSuitability })), null, 2)}

Create a stylish outfit using 2-4 items from the available list that perfectly matches the weather condition and temperature.
Return a JSON object with the following schema:
{
  "title": "string (Catchy name for the outfit)",
  "stylingAdvice": "string (Why these items work well together for the weather)",
  "selectedItemIds": ["string (id of item 1)", "string (id of item 2)"],
  "weatherMatchScore": 95
}
`;
        const response = await ai.interactions.create({
            model: "gemini-3.5-flash",
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
//# sourceMappingURL=index.js.map