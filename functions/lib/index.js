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
const params_1 = require("firebase-functions/params");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const pubsub_1 = require("@google-cloud/pubsub");
const shopperFlow_1 = require("./ai/flows/shopperFlow");
const serpapiKey = (0, params_1.defineSecret)("SERPAPI_API_KEY");
exports.spressoShopper = (0, https_1.onCall)({ secrets: [serpapiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    }
    const { prompt } = request.data;
    const result = await (0, shopperFlow_1.spressoShopperFlow)({ prompt }, { context: { auth: request.auth } });
    return { response: result.response };
});
admin.initializeApp();
// Set 2nd Gen global options for optimal region, concurrency and runtime defaults
(0, v2_1.setGlobalOptions)({
    region: "us-central1",
    concurrency: 80
});
const virtualTryOnFlow_1 = require("./ai/flows/virtualTryOnFlow");
const spin360Flow_1 = require("./ai/flows/spin360Flow");
const pubSubClient = new pubsub_1.PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");
exports.generateVirtualTryOn = (0, https_1.onCall)(async (request) => {
    var _a;
    // Enforce authentication — unauthenticated callers are rejected
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to use Virtual Try-On.");
    }
    const base64Image = (_a = request.data) === null || _a === void 0 ? void 0 : _a.image;
    if (!base64Image) {
        throw new https_1.HttpsError("invalid-argument", 'The function must be called with an "image" field.');
    }
    try {
        const result = await (0, virtualTryOnFlow_1.virtualTryOnFlow)({ base64Image });
        return {
            mediaUrl: result.response
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
    var _a;
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
        const result = await (0, spin360Flow_1.spin360Flow)({
            productId: productData.id || productId,
            name: productData.name,
            brand: productData.brand,
            category: productData.category
        });
        return { mediaUrl: result.response };
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