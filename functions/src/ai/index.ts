import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { PubSub } from "@google-cloud/pubsub";
import { defineSecret } from "firebase-functions/params";

const pubsub = new PubSub();
import { GoogleGenAI } from "@google/genai";
import { behavioralAnalysisFlow } from "./flows/behavioralAnalysisFlow";
import { discoverPersonalizedProductsFlow } from "./flows/discoverPersonalizedProductsFlow";
import { ai } from "./genkit";
import "./tools/addToCart";
import "./tools/searchProducts";
import "./tools/parallelWebSearch";
import "./tools/parallelDeepResearch";
import "./tools/chefAgent";
import "./tools/ecommerceAgent";
import "./tools/virtualTryOnAgent";
import "./tools/marketResearchUKAgent";
import "./tools/marketResearchUSAgent";
import "./tools/kitesurfSearch";
import "./tools/mediaGeneration";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { z } from "zod";
import { generateMediaWithFallback } from "./mediaGeneration";
import { consumeBudget } from "./costControls";
import { selectShopperModel } from "./modelRouting";
import Parallel from "parallel-web";
import { normalizeParallelResults } from "./providers/parallelAdapter";

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const higgsfieldKeyId = defineSecret("HIGGSFIELD_API_KEY_ID");
const higgsfieldKeySecret = defineSecret("HIGGSFIELD_KEY_SECRET");
const serpApiKey = defineSecret("SERPAPI_API_KEY");
const parallelApiKey = defineSecret("PARALLEL_API_KEY");
const cloudflareAccountId = defineSecret("CLOUDFLARE_ACCOUNT_ID");
const cloudflareApiToken = defineSecret("CLOUDFLARE_API_TOKEN");
const mediaSecrets = [geminiApiKey, higgsfieldKeyId, higgsfieldKeySecret];
const shopperSecrets = [...mediaSecrets, serpApiKey, parallelApiKey, cloudflareAccountId, cloudflareApiToken];

export const generateVirtualTryOn = onCall({ enforceAppCheck: true, secrets: mediaSecrets }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined) throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const data = request.data || {};
        const fitProfile = [
            typeof data.height === "string" ? `height ${data.height}` : "",
            typeof data.weight === "string" ? `weight ${data.weight}` : "",
            typeof data.size === "string" ? `usual size ${data.size}` : "",
            typeof data.fitPreference === "string" ? `preferred fit ${data.fitPreference}` : "",
            typeof data.fabric === "string" ? `fabric ${data.fabric}` : "",
        ].filter(Boolean).join(", ");
        const result = await generateMediaWithFallback({
            prompt: `Photorealistic ${data.mediaType === "video" ? "short fashion motion clip" : "virtual try-on image"}. Show ${data.productName || data.productId || "the selected product"} on the person in the reference image. Preserve the person's identity, body proportions, pose, garment construction, color, texture, seams, and logo placement. Use the supplied fit profile only as a visual fitting guide: ${fitProfile || "no measurements supplied"}. Respect the garment's likely drape and fabric weight without inventing measurements. Show natural lighting, realistic contact shadows, and a clean composition. ${data.locationContext ? `Use a subtle, recognizable setting appropriate to the user's coarse location: ${String(data.locationContext).slice(0, 120)}.` : "Use a neutral, softly lit setting."} ${data.customNotes || "Do not change the garment or body shape."}`,
            mediaType: data.mediaType === "video" ? "video" : "image",
            imageUrls: [data.productImage].filter((value): value is string => typeof value === "string" && value.startsWith("http")),
            base64Images: typeof data.userPhotoBase64 === "string" && data.userPhotoBase64
                ? [{ data: data.userPhotoBase64, mimeType: data.userPhotoBase64.match(/^data:([^;]+);/)?.[1] || "image/jpeg" }]
                : [],
            requesterUid: request.auth.uid,
            geminiApiKey: geminiApiKey.value(),
            higgsfieldKeyId: higgsfieldKeyId.value(),
            higgsfieldKeySecret: higgsfieldKeySecret.value(),
        });
        return { tryOnMeta: result };
    } catch (e) {
        throw new HttpsError("internal", "Failed to run virtual try-on flow");
    }
});

export const generateSpin360 = onCall({ enforceAppCheck: true, secrets: mediaSecrets }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (request.app == undefined) throw new HttpsError("failed-precondition", "The function must be called from an App Check verified app.");
    try {
        const data = request.data || {};
        return await generateMediaWithFallback({
            prompt: `Photorealistic product presentation video with a smooth 360-degree rotation for ${data.name || data.productId || "the selected product"}. Keep the product centered and fully visible. Preserve exact shape, materials, texture, color, construction, and proportions. Use consistent studio-quality lighting, realistic shadows, stable camera motion, and no invented parts or text. ${data.category ? `Category: ${data.category}.` : ""} ${data.locationContext ? `Use a tasteful environment inspired by the user's coarse location: ${String(data.locationContext).slice(0, 120)}.` : "Use a neutral studio environment."}`,
            mediaType: "video",
            imageUrls: [data.image].filter((value): value is string => typeof value === "string" && value.startsWith("http")),
            requesterUid: request.auth.uid,
            geminiApiKey: geminiApiKey.value(),
            higgsfieldKeyId: higgsfieldKeyId.value(),
            higgsfieldKeySecret: higgsfieldKeySecret.value(),
        });
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

export const discoverPersonalizedProducts = onCall({ enforceAppCheck: true, secrets: [geminiApiKey, parallelApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    const configuredParallelApiKey = parallelApiKey.value();
    if (!configuredParallelApiKey) {
        throw new HttpsError(
            "failed-precondition",
            "Product discovery is unavailable because PARALLEL_API_KEY is not configured for this environment.",
        );
    }
    try {
        const queries = Array.isArray(request.data?.searchQueries) ? request.data.searchQueries.filter((q: unknown): q is string => typeof q === "string" && Boolean(q.trim())).slice(0, 3) : [];
        if (queries.length === 0) throw new HttpsError("invalid-argument", "At least one search query is required.");
        const parallel = new Parallel({ apiKey: configuredParallelApiKey });
        const research = await parallel.search({
            objective: `Find current merchant product listings for ${queries.join(", ")}. Return listing pages with title, merchant, price when shown, image when shown, and direct product URL. Do not claim inventory or availability.`,
            search_queries: queries,
            mode: "advanced",
            max_chars_total: 12000,
        });
        const providerListings = normalizeParallelResults(Array.isArray(research.results) ? research.results : []);
        const result = await discoverPersonalizedProductsFlow({ searchQueries: queries, requesterUid: request.auth.uid, providerListings });
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
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiApiKey.value()
            },
            body: JSON.stringify({
                uses: 1,
                liveConnectConstraints: {
                    model: "models/gemini-3.1-flash-live-preview",
                    config: {
                        responseModalities: ["AUDIO"],
                        sessionResumption: {}
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to generate token: ${response.statusText}`);
        }

        const data = z.object({ name: z.string().min(1) }).parse(await response.json());
        return { token: data.name };
    } catch (error) {
        console.error("Token generation failed:", error);
        throw new HttpsError("internal", "Failed to generate ephemeral token");
    }
});

export const identifyVisionObject = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
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
            model: "gemini-3.1-flash-lite-preview",
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

export const creatorAgentTemplates = onCall({ enforceAppCheck: true }, async (request) => {
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

export const generateCreatorCampaign = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
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
            model: "gemini-3.1-flash-lite-preview",
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

export const vitposeOrchestrateFit = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
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
            model: "gemini-3.1-flash-lite-preview",
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

export const getQuickPrompts = onCall({ enforceAppCheck: true }, async (request) => {
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

export const logSearchHistory = onCall({ enforceAppCheck: true }, async (request) => {
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

export const chatStream = onRequest({
    secrets: shopperSecrets,
    cors: ["https://get-spresso.web.app", "https://get-spresso.firebaseapp.com"]
}, async (req, res) => {
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

    const authHeader = req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ") || authHeader.slice("Bearer ".length).trim().length === 0) {
        res.status(401).send("Unauthorized");
        return;
    }
    let uid: string;
    try {
        const decodedToken = await getAuth().verifyIdToken(authHeader.slice("Bearer ".length));
        uid = decodedToken.uid;
    } catch (err) {
        console.error("Invalid auth token", err);
        res.status(401).send("Unauthorized");
        return;
    }

    try {
        await getAppCheck().verifyToken(appCheckToken);
    } catch (err) {
        res.status(401).send("Unauthorized: Invalid App Check token");
        return;
    }

    const input = z.object({
        prompt: z.string().trim().min(1).max(4000),
        locale: z.string().trim().min(2).max(16).optional(),
        location: z.string().trim().max(160).optional(),
    }).safeParse(req.body);
    if (!input.success) {
        res.status(400).send("Prompt is required.");
        return;
    }
    const { prompt, locale, location } = input.data;

    try {
        await consumeBudget(uid, "chat");
    } catch {
        res.status(429).send("Please try again later.");
        return;
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const shopperPrompt = ai.prompt("shopperPrompt");
        const { stream } = await shopperPrompt.stream(
            { userPrompt: prompt, locale: locale || "en", locationContext: location || "" },
            {
            model: selectShopperModel(prompt),
            context: { auth: { uid } },
            },
        );

        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error("Stream error", err);
        res.write(`data: ${JSON.stringify({ text: "I couldn't complete that request. Please try again." })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
});

export const generateOutfit = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const { items, weatherCondition, temperatureText, userLocation } = request.data || {};
    if (!items || items.length === 0) {
        throw new HttpsError("invalid-argument", "No wardrobe items provided");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
    try {
        const prompt = `
You are a high-end personal fashion stylist AI.
User Location: ${userLocation || "Unknown"}
Weather: ${weatherCondition} - ${temperatureText}
Available Items (from User's Synchronized Photo Library / Closet):
${JSON.stringify(items.map((item: any) => ({ id: item.id, name: item.name, category: item.category, color: item.color, weather: item.weatherSuitability })), null, 2)}

Create a premium, stylish outfit using 2-4 items from the available list that perfectly matches the weather condition and temperature.
Ensure the styling advice feels tailored and explains why these specific pieces from their personal closet work together as a cohesive look.
Return a JSON object with the following schema:
{
  "title": "string (Catchy, premium name for the outfit)",
  "stylingAdvice": "string (Expert styling advice explaining why these items from their photo library work well together for the current weather)",
  "selectedItemIds": ["string (id of item 1)", "string (id of item 2)"],
  "weatherMatchScore": 95
}
`;
        
        const response = await ai.interactions.create({
            model: "gemini-3.1-flash-lite-preview",
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

export const lensSearch = onCall({ enforceAppCheck: true, secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    
    const { imageBase64 } = request.data || {};
    if (!imageBase64) {
        throw new HttpsError("invalid-argument", "No imageBase64 provided");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
    try {
        const prompt = `
You are an AI personal shopper. 
Analyze the provided image snippet of a product or object.
Identify the item, assign it an estimated price, a high-level category, and a short description.
Return ONLY a JSON object with this exact structure:
{
  "regions": [
    {
      "id": 1,
      "label": "string",
      "price": "string",
      "category": "string",
      "description": "string"
    }
  ]
}
`;
        
        // Ensure data is properly formatted for the inline data part
        // The imageBase64 from the frontend usually includes 'data:image/jpeg;base64,' prefix.
        const cleanBase64 = imageBase64.includes("base64,") ? imageBase64.split("base64,")[1] : imageBase64;

        const response = await ai.interactions.create({
            model: "gemini-3.1-flash-lite-preview",
            input: [
                { type: "image", mime_type: "image/jpeg", data: cleanBase64 },
                { type: "text", text: prompt }
            ],
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
        const parsed = z.object({
            regions: z.array(z.object({
                id: z.number().int(),
                label: z.string().min(1).max(160),
                price: z.string().max(64).optional(),
                category: z.string().max(80).optional(),
                description: z.string().max(500).optional()
            })).max(12)
        }).parse(JSON.parse(responseText));

        const regions = parsed.regions.map(region => ({ ...region, catalogMatched: false }));

        return { regions };
    } catch (e: unknown) {
        console.error("AI Lens error:", e);
        throw new HttpsError("internal", "Visual search is temporarily unavailable.");
    }
});
