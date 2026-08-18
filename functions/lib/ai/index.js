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
exports.chatStream = exports.logSearchHistory = exports.getQuickPrompts = exports.vitposeOrchestrateFit = exports.generateCreatorCampaign = exports.creatorAgentTemplates = exports.identifyVisionObject = exports.generateLiveApiToken = exports.generateSpin360 = exports.generateVirtualTryOn = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const genai_1 = require("@google/genai");
const virtualTryOnFlow_1 = require("./flows/virtualTryOnFlow");
const spin360Flow_1 = require("./flows/spin360Flow");
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
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Identify the primary product in this image. Respond with a JSON object containing the fields: 'productName' (string, short and clean name) and 'estimatedPrice' (number, reasonable estimate)." },
                        { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });
        const text = response.text;
        if (!text)
            throw new Error("Empty response from Gemini");
        const json = JSON.parse(text);
        return {
            success: true,
            detectedResult: {
                hudAnnotationText: json.productName || "Unknown Item",
                price: json.estimatedPrice || 0
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
exports.generateCreatorCampaign = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    throw new https_1.HttpsError("unimplemented", "Creator campaign generation is not yet fully implemented.");
});
exports.vitposeOrchestrateFit = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    throw new https_1.HttpsError("unimplemented", "Vitpose fit orchestration is not fully implemented.");
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
    return { success: true };
});
const admin = __importStar(require("firebase-admin"));
exports.chatStream = (0, https_1.onRequest)({ secrets: [geminiApiKey], cors: true }, async (req, res) => {
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
    try {
        await admin.appCheck().verifyToken(appCheckToken);
    }
    catch (err) {
        res.status(401).send("Unauthorized: Invalid App Check token");
        return;
    }
    const { prompt } = req.body;
    const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
        const responseStream = await ai.models.generateContentStream({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are Spresso Personal Shopper. Keep it brief.",
                temperature: 0.7,
            }
        });
        try {
            for (var _d = true, responseStream_1 = __asyncValues(responseStream), responseStream_1_1; responseStream_1_1 = await responseStream_1.next(), _a = responseStream_1_1.done, !_a; _d = true) {
                _c = responseStream_1_1.value;
                _d = false;
                const chunk = _c;
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = responseStream_1.return)) await _b.call(responseStream_1);
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
//# sourceMappingURL=index.js.map