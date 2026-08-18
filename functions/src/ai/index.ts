import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";
import { virtualTryOnFlow } from "./flows/virtualTryOnFlow";
import { spin360Flow } from "./flows/spin360Flow";
import { behavioralAnalysisFlow } from "./flows/behavioralAnalysisFlow";
import { discoverPersonalizedProductsFlow } from "./flows/discoverPersonalizedProductsFlow";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const generateVirtualTryOn = onCall({ enforceAppCheck: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined) throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const result = await virtualTryOnFlow(request.data);
        return result;
    } catch (e) {
        throw new HttpsError("internal", "Failed to run virtual try-on flow");
    }
});

export const generateSpin360 = onCall({ enforceAppCheck: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined) throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const result = await spin360Flow(request.data);
        return result;
    } catch (e) {
        throw new HttpsError("internal", "Failed to run spin 360 flow");
    }
});

export const analyzeUserBehavior = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    try {
        const result = await behavioralAnalysisFlow(request.data);
        // We could also update the user's profile in Firestore here.
        // For now, we return the data to the client.
        return result;
    } catch (e) {
        throw new HttpsError("internal", "Failed to run behavioral analysis flow");
    }
});

export const discoverPersonalizedProducts = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    try {
        const result = await discoverPersonalizedProductsFlow(request.data);
        return result;
    } catch (e) {
        throw new HttpsError("internal", "Failed to run discover personalized products flow");
    }
});

export const generateLiveApiToken = onCall({ secrets: [geminiApiKey], enforceAppCheck: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be signed in to connect to Gemini Live.");
    }
    if (request.app == undefined) {
        throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
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
    } catch (error) {
        console.error("Token generation failed:", error);
        throw new HttpsError("internal", "Failed to generate ephemeral token");
    }
});

export const identifyVisionObject = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    const { imageBase64 } = request.data || {};
    if (!imageBase64) throw new HttpsError("invalid-argument", "Missing imageBase64");

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
    
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
        if (!text) throw new Error("Empty response from Gemini");
        const json = JSON.parse(text);

        return {
            success: true,
            detectedResult: {
                hudAnnotationText: json.productName || "Unknown Item",
                price: json.estimatedPrice || 0
            }
        };
    } catch (e: any) {
        console.error("Vision API error:", e);
        throw new HttpsError("internal", "Failed to identify vision object");
    }
});

export const creatorAgentTemplates = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await import("../shared/db");
        const snapshot = await db.collection("creator_templates").get();
        const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { templates };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch creator agent templates");
    }
});

export const generateCreatorCampaign = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    throw new HttpsError("unimplemented", "Creator campaign generation is not yet fully implemented.");
});

export const vitposeOrchestrateFit = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    throw new HttpsError("unimplemented", "Vitpose fit orchestration is not fully implemented.");
});

export const getQuickPrompts = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await import("../shared/db");
        const snapshot = await db.collection("quick_prompts").get();
        const prompts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { prompts };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch quick prompts");
    }
});

export const logSearchHistory = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    return { success: true };
});

import * as admin from "firebase-admin";

export const chatStream = onRequest({ secrets: [geminiApiKey], cors: true }, async (req, res) => {
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
    } catch (err) {
        res.status(401).send("Unauthorized: Invalid App Check token");
        return;
    }

    const { prompt } = req.body;
    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
    
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

        for await (const chunk of responseStream) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error("Stream error", err);
        res.write(`data: ${JSON.stringify({ text: "Error connecting to AI." })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
});
