import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

import { PubSub } from "@google-cloud/pubsub";
import { onCallGenkit } from "@genkit-ai/firebase/functions";
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

export const generateVirtualTryOn = onCallGenkit({
    authPolicy: (auth) => {
        if (!auth) {
            throw new HttpsError("unauthenticated", "You must be signed in to use Virtual Try-On.");
        }
    }
}, virtualTryOnFlow);

export const generateSpin360 = onCallGenkit({
    authPolicy: (auth) => {
        if (!auth) {
            throw new HttpsError("unauthenticated", "You must be signed in to use Spin 360.");
        }
    }
}, spin360Flow);

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const generateLiveApiToken = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be signed in to connect to Gemini Live.");
    }

    try {
        // Exchange Gemini API key for an Ephemeral Token
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
    } catch (error) {
        console.error("Token generation failed:", error);
        throw new HttpsError("internal", "Failed to generate ephemeral token");
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
