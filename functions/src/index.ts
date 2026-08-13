import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { PubSub } from "@google-cloud/pubsub";

admin.initializeApp();

// Set 2nd Gen global options for optimal region, concurrency and runtime defaults
setGlobalOptions({
    region: "us-central1",
    concurrency: 80
});

const ai = new GoogleGenAI({});
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

        const outputText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!outputText) {
            throw new Error("Empty response from Gemini");
        }

        return {
            mediaUrl: outputText
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
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
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [{
                role: "user",
                parts: [{
                    text: `Generate a detailed 360-degree product description for: ${productData.name || productId}. Brand: ${productData.brand || "unknown"}. Category: ${productData.category || "unknown"}.`
                }]
            }]
        });

        const outputText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return { mediaUrl: outputText };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
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
        throw new HttpsError("internal", "Failed to process interaction");
    }
});
