import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

import { PubSub } from "@google-cloud/pubsub";
import { spressoShopperFlow } from "./ai/flows/shopperFlow";

const serpapiKey = defineSecret("SERPAPI_API_KEY");

export const spressoShopper = onCall({ secrets: [serpapiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const { prompt } = request.data;
    const result = await spressoShopperFlow({ prompt }, { context: { auth: request.auth } });
    return { response: result.response };
});

admin.initializeApp();

// Set 2nd Gen global options for optimal region, concurrency and runtime defaults
setGlobalOptions({
    region: "us-central1",
    concurrency: 80
});

import { virtualTryOnFlow } from "./ai/flows/virtualTryOnFlow";
import { spin360Flow } from "./ai/flows/spin360Flow";

const pubSubClient = new PubSub();
const interactionsTopic = pubSubClient.topic("interactions-topic");

export const generateVirtualTryOn = onCall(async (request) => {
    // Enforce authentication — unauthenticated callers are rejected
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be signed in to use Virtual Try-On.");
    }

    const base64Image = request.data?.image;
    if (!base64Image) {
        throw new HttpsError("invalid-argument", 'The function must be called with an "image" field.');
    }

    try {
        const result = await virtualTryOnFlow({ base64Image });

        return {
            mediaUrl: result.response
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("Virtual Try-On generation failed:", error);
        throw new HttpsError("internal", "AI generation failed");
    }
});

export const generateSpin360 = onCall(async (request) => {
    // Enforce authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be signed in to use Spin 360.");
    }

    const productId = request.data?.productId;
    if (!productId) {
        throw new HttpsError("invalid-argument", 'The function must be called with a "productId" field.');
    }

    try {
        // Query Firestore for the product's 3D/360 asset URL
        const productDoc = await admin.firestore().collection("inventory").doc(productId).get();
        if (!productDoc.exists) {
            throw new HttpsError("not-found", `Product ${productId} not found.`);
        }

        const productData = productDoc.data()!;
        const spin360Url = productData.spin360Url || productData.videoUrl;

        if (spin360Url) {
            return { mediaUrl: spin360Url };
        }

        // Fallback: ask Gemini to describe the 360 view from available product metadata
        const result = await spin360Flow({
            productId: productData.id || productId,
            name: productData.name,
            brand: productData.brand,
            category: productData.category
        });

        return { mediaUrl: result.response };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("Spin 360 generation failed:", error);
        throw new HttpsError("internal", "AI generation failed");
    }
});

// Scalable Backend Architecture: Event-Driven Ingestion API
export const ingestInteraction = onCall(async (request) => {
    // Enforce authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be signed in to record interactions.");
    }

    const { productId, action } = request.data || {};
    if (!productId || !action) {
        throw new HttpsError("invalid-argument", "Must provide productId and action");
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
    } catch (e) {
        console.error("Interaction ingestion failed:", e);
        throw new HttpsError("internal", "Failed to process interaction");
    }
});
