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
exports.ingestInteraction = void 0;
const https_1 = require("firebase-functions/v2/https");
const pubsub_1 = require("@google-cloud/pubsub");
const z = __importStar(require("zod"));
const pubsub = new pubsub_1.PubSub();
const interactionsTopic = pubsub.topic("product-interactions");
const interactionSchema = z.object({
    action: z.string().min(1),
    productId: z.string().min(1),
    timestamp: z.string().optional(),
});
exports.ingestInteraction = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to log interactions.");
    }
    const parseResult = interactionSchema.safeParse(request.data);
    if (!parseResult.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid interaction payload.");
    }
    const { action, productId, timestamp } = parseResult.data;
    const userUid = request.auth.uid;
    const eventPayload = {
        action,
        productId,
        userId: userUid,
        timestamp: timestamp || new Date().toISOString(),
    };
    try {
        // Fire and forget to Pub/Sub
        await interactionsTopic.publishMessage({
            json: eventPayload,
        });
        return { success: true };
    }
    catch (error) {
        console.error("Failed to publish interaction event to Pub/Sub", error);
        throw new https_1.HttpsError("internal", "Failed to log interaction.");
    }
});
//# sourceMappingURL=interactions.js.map