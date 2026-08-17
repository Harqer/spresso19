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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestInteraction = exports.generateSpin360 = exports.generateVirtualTryOn = exports.spressoShopper = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const genai_1 = require("@google/genai");
const pubsub_1 = require("@google-cloud/pubsub");
const https_2 = require("firebase-functions/v2/https");
const shopperFlow_1 = require("./ai/flows/shopperFlow");
exports.spressoShopper = (0, https_2.onCallGenkit)({
    authPolicy: (auth) => {
        if (!auth) {
            throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
        }
    }
}, shopperFlow_1.spressoShopperFlow);
admin.initializeApp();
// Set 2nd Gen global options for optimal region, concurrency and runtime defaults
(0, v2_1.setGlobalOptions)({
    region: "us-central1",
    concurrency: 80
});
const ai = new genai_1.GoogleGenAI({});
const pubSubClient = new pubsub_1.PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");
exports.generateVirtualTryOn = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f;
    // Enforce authentication — unauthenticated callers are rejected
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to use Virtual Try-On.");
    }
    const base64Image = (_a = request.data) === null || _a === void 0 ? void 0 : _a.image;
    if (!base64Image) {
        throw new https_1.HttpsError("invalid-argument", 'The function must be called with an "image" field.');
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: "You are a virtual try-on AI. Analyze this image of a person and describe how the featured clothing or accessory looks on them in detail. Provide realistic feedback on fit, style, and color compatibility."
                        },
                        {
                            inlineData: { mimeType: "image/jpeg", data: base64Image }
                        }
                    ]
                }
            ]
        });
        const outputText = (_f = (_e = (_d = (_c = (_b = response.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
        if (!outputText) {
            throw new Error("Empty response from Gemini");
        }
        return {
            mediaUrl: outputText
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("Virtual Try-On generation failed:", error);
        throw new https_1.HttpsError("internal", "AI generation failed");
    }
});
exports.generateSpin360 = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f;
    var _g;
    // Enforce authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to use Spin 360.");
    }
    const productId = (_a = request.data) === null || _a === void 0 ? void 0 : _a.productId;
    if (!productId) {
        throw new https_1.HttpsError("invalid-argument", 'The function must be called with a "productId" field.');
    }
    try {
        // Query Firestore for the product's 3D/360 asset URL
        const productDoc = await admin.firestore().collection("inventory").doc(productId).get();
        if (!productDoc.exists) {
            throw new https_1.HttpsError("not-found", `Product ${productId} not found.`);
        }
        const productData = productDoc.data();
        const spin360Url = productData.spin360Url || productData.videoUrl;
        if (spin360Url) {
            return { mediaUrl: spin360Url };
        }
        // Fallback: ask Gemini to describe the 360 view from available product metadata
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [{
                    role: "user",
                    parts: [{
                            text: `Generate a detailed 360-degree product description for: ${productData.name || productId}. Brand: ${productData.brand || "unknown"}. Category: ${productData.category || "unknown"}.`
                        }]
                }]
        });
        const outputText = (_g = (_f = (_e = (_d = (_c = (_b = response.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) !== null && _g !== void 0 ? _g : "";
        return { mediaUrl: outputText };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("Spin 360 generation failed:", error);
        throw new https_1.HttpsError("internal", "AI generation failed");
    }
});
// Scalable Backend Architecture: Event-Driven Ingestion API
exports.ingestInteraction = (0, https_1.onCall)(async (request) => {
    // Enforce authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to record interactions.");
    }
    const { productId, action } = request.data || {};
    if (!productId || !action) {
        throw new https_1.HttpsError("invalid-argument", "Must provide productId and action");
    }
    const eventPayload = {
        userId: request.auth.uid,
        productId,
        action,
        timestamp: new Date().toISOString()
    };
    try {
        // Publish immediately to Pub/Sub to decouple from database
        const messageId = await interactionsTopic.publishMessage({
            data: Buffer.from(JSON.stringify(eventPayload))
        });
        // Return 202 Accepted instantly to the client
        return {
            status: "202 Accepted",
            messageId
        };
    }
    catch (e) {
        console.error("Interaction ingestion failed:", e);
        throw new https_1.HttpsError("internal", "Failed to process interaction");
    }
});
//# sourceMappingURL=index.js.map