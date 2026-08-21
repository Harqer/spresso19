import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { PubSub } from "@google-cloud/pubsub";
import { defineSecret } from "firebase-functions/params";

const pubsub = new PubSub();
import { GoogleGenAI } from "@google/genai";
import { virtualTryOnFlow } from "./flows/virtualTryOnFlow";
import { spin360Flow } from "./flows/spin360Flow";
import { behavioralAnalysisFlow } from "./flows/behavioralAnalysisFlow";
import { discoverPersonalizedProductsFlow } from "./flows/discoverPersonalizedProductsFlow";
import { ai } from "./genkit";
import { prepareCryptoPurchaseTool } from "./tools/prepareCryptoPurchase";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";

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
            safety_settings: safetySettings as any,
            tools: [{
                name: "logProductDiscovery",
                description: "Logs the newly discovered product from the visual search.",
                parameters: {
                    type: "OBJECT",
                    properties: { productName: { type: "STRING" }, price: { type: "NUMBER" } },
                    required: ["productName", "price"]
                }
            }] as any,
            tool_config: { function_calling_config: { mode: "ANY" } } as any
        } as any);

        let hudAnnotationText = "Unknown Item";
        let price = 0;
        
        if ((response as any).functionCalls && (response as any).functionCalls.length > 0) {
            const toolCall = (response as any).functionCalls[0];
            if (toolCall.name === "logProductDiscovery" && toolCall.args) {
                hudAnnotationText = toolCall.args.productName as string;
                price = toolCall.args.price as number;
                console.log(`Multimodal Trigger: Logging discovery of ${hudAnnotationText} (${price})`);
                await pubsub.topic("telemetry-search-history").publishMessage({ json: { event: "vision_discovery", productName: hudAnnotationText, price, uid: request.auth.uid } });
            }
        } else {
             const text = response.output_text;
             if (!text) throw new Error("Empty response from Gemini");
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
        const templates = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return { templates };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch creator agent templates");
    }
});

export const generateCreatorCampaign = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    const { productName, campaignGoal, targetAudience } = request.data || {};
    if (!productName || !campaignGoal) throw new HttpsError("invalid-argument", "Missing required campaign parameters.");

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    const safetySettings = [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ];

    try {
        const response = await ai.interactions.create({
            safety_settings: safetySettings as any,
            model: "gemini-3.5-flash",
            input: `You are an expert marketing AI. Generate a creator campaign for the product "${productName}". The goal is "${campaignGoal}" and the target audience is "${targetAudience || 'General'}". Return ONLY a JSON object with this exact structure: {"campaignTitle": "...", "socialMediaCopy": "...", "suggestedTags": ["...", "..."]}`,
            response_mime_type: "application/json"
        });

        const responseText = response.output_text;
        if (!responseText) throw new Error("Empty response from Gemini");
        const parsed = JSON.parse(responseText);
        return { success: true, campaign: parsed };
    } catch (e: any) {
        throw new HttpsError("internal", `Failed to generate campaign: ${e.message}`);
    }
});

export const vitposeOrchestrateFit = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    const { imageBase64 } = request.data || {};
    if (!imageBase64) throw new HttpsError("invalid-argument", "Missing imageBase64");

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    const safetySettings = [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ];

    try {
        const response = await ai.interactions.create({
            safety_settings: safetySettings as any,
            model: "gemini-3.5-flash",
            input: [
                { type: "image", mime_type: "image/jpeg", data: imageBase64 },
                { type: "text", text: "Analyze this image for virtual try-on fit orchestration. Identify the key body regions and garment fit profile. Return ONLY a JSON object with this exact structure: {\"fitScore\": 0.0-100.0, \"garmentType\": \"...\", \"postureDetected\": \"...\", \"confidence\": 0.0-100.0}" }
            ],
            response_mime_type: "application/json"
        });

        const responseText = response.output_text;
        if (!responseText) throw new Error("Empty response from Gemini");
        const parsed = JSON.parse(responseText);
        return { success: true, fitAnalysis: parsed };
    } catch (e: any) {
        throw new HttpsError("internal", `Failed to orchestrate fit: ${e.message}`);
    }
});

export const getQuickPrompts = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    try {
        const { db } = await import("../shared/db");
        const snapshot = await db.collection("quick_prompts").get();
        const prompts = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        return { prompts };
    } catch (e) {
        throw new HttpsError("internal", "Failed to fetch quick prompts");
    }
});

export const logSearchHistory = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    // Offload telemetry to Pub/Sub to decouple from the interactive critical path
    const topic = pubsub.topic("telemetry-search-history");
    await topic.publishMessage({ json: request.data || {} });
    
    return { success: true, queued: true };
});

export const processSearchHistoryTelemetry = onMessagePublished("telemetry-search-history", async (event) => {
    const data = event.data.message.json;
    console.log("Processing search history telemetry in background:", data);
});

export const createCatalogCache = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    try {
        const { db } = await import("../shared/db");
        // Assume products collection holds the large catalog
        const snapshot = await db.collection("products").get();
        const catalog = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const catalogText = JSON.stringify(catalog);
        
        const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
        const cachedContent = await (ai.caches as any).create({
            model: "gemini-3.5-flash",
            input: `Here is the full product catalog:\n${catalogText}`,
            ttl: "3600s" // Cache for 1 hour
        });
        
        return { success: true, cacheName: cachedContent.name, expireTime: cachedContent.expireTime };
    } catch (e: any) {
        throw new HttpsError("internal", `Failed to create catalog cache: ${e.message}`);
    }
});
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

    let uid: string | undefined;
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const decodedToken = await getAuth().verifyIdToken(authHeader.split("Bearer ")[1]);
            uid = decodedToken.uid;
        } catch (err) {
            console.error("Invalid auth token", err);
        }
    }

    try {
        await getAppCheck().verifyToken(appCheckToken);
    } catch (err) {
        res.status(401).send("Unauthorized: Invalid App Check token");
        return;
    }

    const { prompt, locale } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const { stream } = await ai.generateStream({
            model: "googleai/gemini-1.5-flash",
            prompt: prompt,
            system: `You are Spresso Personal Shopper. Keep it brief. You must reply natively in this language locale: ${locale || 'en'}`,
            tools: [prepareCryptoPurchaseTool],
            context: { auth: { uid } },
            config: {
                safetySettings: [
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                ] as any
            }
        });

        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
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

export const generateOutfit = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const { items, weatherCondition, temperatureText, userLocation } = request.data || {};
    if (!items || items.length === 0) {
        throw new HttpsError("invalid-argument", "No wardrobe items provided");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
    try {
        const prompt = `
You are a personal fashion stylist AI.
User Location: ${userLocation || "Unknown"}
Weather: ${weatherCondition} - ${temperatureText}
Available Items:
${JSON.stringify(items.map((item: any) => ({ id: item.id, name: item.name, category: item.category, color: item.color, weather: item.weatherSuitability })), null, 2)}

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
            ] as any
        });

        const responseText = response.output_text;
        if (!responseText) throw new Error("Empty response from Gemini");
        const parsed = JSON.parse(responseText);
        return { success: true, result: parsed };
    } catch (e: any) {
        console.error("AI Outfit error:", e);
        throw new HttpsError("internal", `Failed to generate outfit: ${e.message}`);
    }
});
