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
exports.ingestInteraction = exports.generateSpin360 = exports.generateVirtualTryOn = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const genai_1 = require("@google/genai");
const pubsub_1 = require("@google-cloud/pubsub");
admin.initializeApp();
const ai = new genai_1.GoogleGenAI({});
const pubSubClient = new pubsub_1.PubSub();
const interactionsTopic = pubSubClient.topic('interactions-topic');
exports.generateVirtualTryOn = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    // Enforce authentication — unauthenticated callers are rejected
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to use Virtual Try-On.');
    }
    const base64Image = data.image;
    if (!base64Image) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "image" field.');
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
        const outputText = (_e = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!outputText) {
            throw new Error("Empty response from Gemini");
        }
        return {
            mediaUrl: outputText
        };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'AI generation failed');
    }
});
exports.generateSpin360 = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    // Enforce authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to use Spin 360.');
    }
    const productId = data.productId;
    if (!productId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "productId" field.');
    }
    try {
        // Query Firestore for the product's 3D/360 asset URL
        const productDoc = await admin.firestore().collection('inventory').doc(productId).get();
        if (!productDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Product ${productId} not found.`);
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
                            text: `Generate a detailed 360-degree product description for: ${productData.name || productId}. Brand: ${productData.brand || 'unknown'}. Category: ${productData.category || 'unknown'}.`
                        }]
                }]
        });
        const outputText = (_f = (_e = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : "";
        return { mediaUrl: outputText };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'AI generation failed');
    }
});
// Scalable Backend Architecture: Event-Driven Ingestion API
exports.ingestInteraction = functions.https.onCall(async (data, context) => {
    // Enforce authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to record interactions.');
    }
    const { productId, action } = data;
    if (!productId || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'Must provide productId and action');
    }
    const eventPayload = {
        userId: context.auth.uid,
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
            status: '202 Accepted',
            messageId
        };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Failed to process interaction');
    }
});
//# sourceMappingURL=index.js.map