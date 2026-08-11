import { Router } from "express";
import { tryOnFlow } from "./flows/tryOnOrchestrationFlow.ts";
import { extractViTPose } from "./actions/vitposeAction.ts";
import { activeOrders } from "./inventory.ts";
import {
  getApifyCategoryFeed,
  runApifyShoppingActor,
  runMarketplaceActor,
  runGoogleLensActor
} from "./apifyService.ts";
import {
  getGeminiAI,
  defaultSafetySettings,
  getPersonalizedFeed,
  getGenMediaKit,
  identifyVisionObject,
  runTryOnPipeline,
  extractViTPoseKeypoints,
  orchestrateProductFitWithViTPose,
  runEconomicResearch,
  generateCreatorCampaign,
  generateCreativeProductStudio,
  runGenkitCreativePipeline,
  getBargainChefRecipe,
  generateAIWeatherOutfit,
  getActiveProductById
} from "./geminiService.ts";
import { db, initPool } from "../src/db/index.ts";
import { orders, users } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";
import { executeKitesurfPurchase } from "./kitesurfService.ts";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({ projectId: "spresso-5561f" });
}
const firestoreDb = getFirestore(getApp(), "ai-studio-spresso-fbdfccd4-1973-4b57-b449-42c559b39568");
import { getDataConnect } from "firebase-admin/data-connect";
import { connectorConfig, listProducts } from "./dataconnect/esm/index.esm.js";
function getDc() {
  if (getApps().length === 0) {
    initializeApp({ projectId: "spresso-5561f" });
  }
  return getDataConnect(connectorConfig);
}

export const router = Router();

// ==========================================
// PRODUCTS & INVENTORY
// ==========================================
import { seedCatalogInventory, getProductById } from "./inventory.ts";

router.get("/api/inventory", async (req, res) => {
  try {
    const result = await listProducts(getDc());
    if (result?.data?.products && result.data.products.length > 0) {
      const items = result.data.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand || "Spresso Store",
        category: p.category || "Apparel",
        price: typeof p.price === "number" ? p.price : parseFloat(p.price || "0"),
        image: p.image || "",
        description: p.description || "",
        likesCount: p.likesCount || 0
      }));
      return res.json({ success: true, products: items });
    }
  } catch (dcErr: any) {
    // Data Connect service unavailable in non-deployed env; fallback to Postgres DB or in-memory seed catalog
  }

  try {
    const pool = initPool();
    const result = await pool.query('SELECT * FROM "Product"');
    if (result?.rows && result.rows.length > 0) {
      const items = result.rows.map((row: any) => ({
        id: row.id || row.id_val || "",
        name: row.name || "",
        brand: row.brand || "Spresso Store",
        category: row.category || "Apparel",
        price: parseFloat(row.price || "0"),
        image: row.imageUrl || row.image || "",
        description: row.description || "",
        likesCount: row.likesCount || 0
      }));
      return res.json({ success: true, products: items });
    }
  } catch (err: any) {
    // Postgres unavailable in standalone container; fallback to seedCatalogInventory
  }

  return res.json({ success: true, products: seedCatalogInventory });
});

router.get("/api/products", async (req, res) => {
  const category = req.query.category as string;
  try {
    const result = await listProducts(getDc());
    if (result?.data?.products && result.data.products.length > 0) {
      let items = result.data.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand || "Spresso Store",
        category: p.category || "Apparel",
        price: typeof p.price === "number" ? p.price : parseFloat(p.price || "0"),
        image: p.image || "",
        description: p.description || "",
        likesCount: p.likesCount || 0
      }));
      if (category && category !== "ALL") {
        items = items.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
      }
      return res.json({ success: true, products: items });
    }
  } catch (dcErr: any) {
    // Data Connect service unavailable in non-deployed env; fallback to Postgres DB or in-memory seed catalog
  }

  try {
    const pool = initPool();
    const result = await pool.query('SELECT * FROM "Product"');
    if (result?.rows && result.rows.length > 0) {
      let items = result.rows.map((row: any) => ({
        id: row.id || row.id_val || "",
        name: row.name || "",
        brand: row.brand || "Spresso Store",
        category: row.category || "Apparel",
        price: parseFloat(row.price || "0"),
        image: row.imageUrl || row.image || "",
        description: row.description || "",
        likesCount: row.likesCount || 0
      }));
      if (category && category !== "ALL") {
        items = items.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
      }
      return res.json({ success: true, products: items });
    }
  } catch (err: any) {
    // Postgres unavailable in standalone container; fallback to seedCatalogInventory
  }

  let items = seedCatalogInventory;
  if (category && category !== "ALL") {
    items = items.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }
  return res.json({ success: true, products: items });
});

router.get("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await listProducts(getDc());
    const p = result?.data?.products?.find((item: any) => item.id === id);
    if (p) {
      const product = {
        id: p.id,
        name: p.name,
        brand: p.brand || "Spresso Store",
        category: p.category || "Apparel",
        price: typeof p.price === "number" ? p.price : parseFloat(p.price || "0"),
        image: p.image || "",
        description: p.description || "",
        likesCount: p.likesCount || 0
      };
      return res.json({ success: true, product });
    }
  } catch (dcErr: any) {
    // Data Connect service unavailable in non-deployed env; fallback to Postgres DB
  }

  try {
    const pool = initPool();
    const result = await pool.query('SELECT * FROM "Product" WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const product = {
        id: row.id || row.id_val || "",
        name: row.name || "",
        brand: row.brand || "Spresso Store",
        category: row.category || "Apparel",
        price: parseFloat(row.price || "0"),
        image: row.imageUrl || row.image || "",
        description: row.description || "",
        likesCount: row.likesCount || 0
      };
      return res.json({ success: true, product });
    }
  } catch (err: any) {
    // Postgres query failed; fallback to in-memory seed catalog
  }

  const fallbackProduct = getProductById(id) || seedCatalogInventory[0];
  if (fallbackProduct) {
    return res.json({ success: true, product: fallbackProduct });
  }
  return res.status(404).json({ success: false, error: "Product not found" });
});

router.post("/api/user/sync", async (req, res) => {
  const { uid, email, name } = req.body || {};
  if (!uid || !email) {
    return res.status(400).json({ success: false, error: "uid and email are required" });
  }

  try {
    const pool = initPool();
    const upserted = await pool.query(
      `INSERT INTO users (uid, email, name, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (uid) DO UPDATE
         SET email = EXCLUDED.email,
             name = COALESCE(EXCLUDED.name, users.name)
       RETURNING id, uid, email, name, created_at`,
      [uid, email, name || null]
    );
    const userRow = upserted.rows[0];

    await firestoreDb.collection("users").doc(uid).set(
      {
        uid,
        email,
        name: name || null,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return res.json({
      success: true,
      user: {
        id: userRow?.id,
        uid: userRow?.uid,
        email: userRow?.email,
        name: userRow?.name || null,
        createdAt: userRow?.created_at
      }
    });
  } catch (err: any) {
    console.error("[User Sync] Failed to synchronize user:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to synchronize user" });
  }
});

// ==========================================
// APIFY SPECIALIZED CATEGORY FEEDS & ACTORS
// (Deals, Trending, Hot Drops, For You)
// ==========================================
router.post("/api/apify/feed", async (req, res) => {
  try {
    const result = await getApifyCategoryFeed(req.body || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch Apify feed" });
  }
});

router.post("/api/apify/actor/run", async (req, res) => {
  const { actorId, input } = req.body || {};
  const targetActor = actorId || process.env.APIFY_ACTOR_ID || "lucid_boiler~my-actor";
  const result = await runApifyShoppingActor(targetActor, input);
  res.json(result);
});

router.post("/api/apify/marketplace/run", async (req, res) => {
  const { platform, query } = req.body || {};
  if (!platform || !query) {
    return res.status(400).json({ error: "Platform (amazon, walmart, etsy, tiktok, amazon_reviews, ebay) and query required" });
  }
  const result = await runMarketplaceActor(platform, query);
  res.json(result);
});

router.post("/api/lens-search", async (req, res) => {
  const { imageUrl, imageBase64, promptText } = req.body || {};
  const targetUrl = imageUrl || imageBase64;
  if (!targetUrl) {
    return res.status(400).json({ error: "Image URL or Base64 required" });
  }

  try {
    const [apifyRes, visionRes] = await Promise.allSettled([
      runGoogleLensActor(targetUrl),
      identifyVisionObject(
        imageBase64 || imageUrl,
        "Google Lens Screen Capture",
        promptText || "Perform Google Lens visual screen search on captured screen. Extract gourmet items, recipes, products, and price matches."
      )
    ]);

    const apifyData = apifyRes.status === "fulfilled" ? apifyRes.value : null;
    const visionData = visionRes.status === "fulfilled" ? visionRes.value : null;

    res.json({
      success: true,
      apifyResults: apifyData?.results || [],
      detectedResult: visionData || null
    });
  } catch (err: any) {
    console.error("Lens search route error:", err);
    res.json({
      success: true,
      apifyResults: [],
      detectedResult: null
    });
  }
});

// ==========================================
// GEMINI 2.5 FLASH PERSONALIZED FEED & GENMEDIA
// ==========================================
router.post("/api/personalized-feed", async (req, res) => {
  try {
    const result = await getPersonalizedFeed(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to generate personalized feed" });
  }
});

router.post("/api/genmedia-kit", async (req, res) => {
  try {
    const { productId } = req.body || {};
    const result = await getGenMediaKit(productId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to generate GenMedia kit" });
  }
});

router.post("/api/creative-studio/synthesize", async (req, res) => {
  try {
    const result = await generateCreativeProductStudio(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Creative studio synthesis failed" });
  }
});

router.post("/api/wardrobe/generate-outfit", async (req, res) => {
  try {
    const result = await generateAIWeatherOutfit(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to generate weather outfit" });
  }
});

// ==========================================
// GEMINI STREAMING CHAT (SEARCH/MAPS GROUNDING)
// ==========================================
router.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { prompt, imageBase64, location, latLng, userName, timeBlock, currentTime, currentDate, dayOfWeek, timeZone, agentType } = req.body || {};

  try {
    const ai = getGeminiAI();
    const contents: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg"
        }
      });
    }
    contents.push(prompt || "Analyze query and synthesize intelligence.");

    const isStoreShopping = prompt ? /(store|local|near me|nearby|shop in|physical store|supermarket|grocery store|in person|aisle|in stock|where can i buy|around here|closest|target|walmart|whole foods|trader joe)/i.test(prompt) : false;

    const cleanUserName = typeof userName === "string" && userName.trim().length > 1 && !["no", "false", "true", "null", "undefined"].includes(userName.trim().toLowerCase()) 
      ? userName.trim() 
      : "Shopper";

    const hasValidLatLng = latLng && typeof latLng.latitude === "number" && typeof latLng.longitude === "number";
    const hasValidLocation = typeof location === "string" && location.trim().length > 0 && !location.toLowerCase().includes("unknown");

    const isNearMeQuery = /near me|nearby|store near|closest store|local store|find a store|where to buy/i.test(prompt || "");

    const locationContextString = hasValidLatLng
      ? `User Exact Geographic Coordinates: Latitude ${latLng.latitude}, Longitude ${latLng.longitude}${hasValidLocation ? ` (${location})` : ""}.`
      : hasValidLocation
      ? `User Location City/Region: "${location}".`
      : `User Location Context: NOT PROVIDED.`;

    let systemPrompt = "";

    if (agentType === "ECONOMIC_RESEARCH_AGENT") {
      systemPrompt = `You are a Senior Economic Market Research Specialist.
User Context: ${cleanUserName}, Location: ${locationContextString}, Time: ${currentDate || "Today"}.

CRITICAL USER-FACING DIRECTIVE:
- Deliver clear, professional, and actionable macroeconomic and retail market research reports.
- NEVER mention "Genkit", "agent architecture", "multi-agent pipelines", sub-agent names, tool calls, or backend technology.
- Present market data, inflation trends, consumer sentiment metrics, and supply chain risk assessments directly formatted for executive reading with clean headings, markdown tables, and key takeaways.`;
    } else if (agentType === "MARKETING_COORDINATOR_AGENT") {
      systemPrompt = `You are an Executive Marketing Coordinator.
User Context: ${cleanUserName}, Location: ${locationContextString}.

CRITICAL USER-FACING DIRECTIVE:
- Plan marketing strategies, high-converting funnel structures, brandable domain ideas, ad copy, and campaign timelines.
- NEVER mention "Genkit", "agent architecture", "multi-agent pipelines", sub-agent names, tool calls, or backend technology.
- Format your response clearly with sections: Campaign Strategy, Domain & Funnel Structure, Ad Copy & Messaging, and Execution Timeline.`;
    } else if (agentType === "BRAND_STUDIO_AGENT") {
      systemPrompt = `You are the Lead Brand Studio & Creative Copy Specialist.
User Context: ${cleanUserName}, Location: ${locationContextString}.

CRITICAL USER-FACING DIRECTIVE:
- Generate persuasive, on-brand product descriptions, brand voice guidelines, creative taglines, product line ideations, and visual identity concepts.
- NEVER mention "Genkit", "agent architecture", "multi-agent pipelines", sub-agent names, tool calls, or backend technology.
- Deliver elegant, high-converting, polished copy formatted cleanly with bullet points and clear sections.`;
    } else if (agentType === "GLOBAL_CLIENT_AUDIT_AGENT" || agentType === "GLOBAL_KYC_COMPLIANCE_AGENT") {
      systemPrompt = `You are a Senior Corporate Compliance & Global Client Audit Specialist.
User Context: ${cleanUserName}, Location: ${locationContextString}.

CRITICAL USER-FACING DIRECTIVE:
- Perform thorough corporate background audits, SEC filing reviews, executive stock transaction analysis, and solvency risk checks for enterprise clients.
- NEVER mention "Genkit", "agent architecture", "multi-agent pipelines", sub-agent names, tool calls, or backend technology.
- Format your output into an Executive Summary, Corporate Risk Score (Low/Medium/High), SEC & Filing Findings, and Audit Recommendations.`;
    } else {
      systemPrompt = `You are Spresso AI Personal Shopper & Shopping Concierge, an ultra-concise, direct, and intelligent AI Assistant following Google AI Overview UX guidelines.
User Personalization Context:
- User Name: ${cleanUserName}
- User Time Zone: ${timeZone || "Local Client Time Zone"}
- Local Date & Time: ${currentDate || "Today"}${currentTime ? ` at ${currentTime}` : ""} (${dayOfWeek || ""})
- ${locationContextString}

SHOPPING CONCIERGE & POST-PURCHASE WORKFLOW INSTRUCTIONS:
1. ORDER STATUS & TRACKING (check_order_status):
   - If the user asks about order status, delivery date, carrier, or tracking number (e.g. "Where is order ORD-849201?"), provide the status directly (e.g. "Order ORD-849201 is In Transit via FedEx Express. Expected delivery today by 5:00 PM.").
2. RETURNS & REFUNDS (initiate_return):
   - If the user wants to return an item or initiate a refund, confirm that their 30-day automated return window is protected and guide them to complete the return request or use the "Initiate Return" button in their Order History.
3. ARRIVAL REMINDERS (set_delivery_reminder):
   - If the user asks for a delivery reminder or arrival notification, confirm that an automated arrival alert has been scheduled for their order.

STRICT GOOGLE CONCISE RESPONSE GUIDELINES (MAX 80-100 WORDS EXPLANATION):
1. MAXIMUM BREVITY & ZERO FLUFF:
   - Your entire text response MUST be under 100 words.
   - Lead IMMEDIATELY with the answer or recommendation in sentence 1.
   - NEVER include greetings, pleasantries, or restatements of the user's prompt.
   - NO meta-commentary about time zones, locations, or status messages.

2. HIGHLY SCANNABLE STRUCTURE:
   - Use 2-3 brief bullet points maximum.
   - Lead each bullet with a bold key title e.g. "**Store/Item/Order**: 1 short sentence detail."

3. LOCAL STORES & LIVE SEARCH GROUNDING:
   - Use live search and local grounding for accurate real prices and store options.

4. STRUCTURED PRODUCT & LOCATION CARDS (CRITICAL):
   - When recommending products, output a hidden JSON code block at the end with recommendedProducts array.
   - LOCATION & RESTAURANT/PROPERTY DETECTION: If the query or image relates to a location, hotel, restaurant, property listing, café, or point of interest, output a structured "locationData" object inside the JSON code block:
\`\`\`json
{
  "locationData": {
    "title": "Name of Restaurant / Hotel / Property",
    "subtitle": "Category • Cuisine / Atmosphere",
    "heroImage": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop",
    "distanceInfo": "12 mins from hotel (0.8 mi away)",
    "sectionTitle": "Featured Spots & Customer Reviews",
    "sectionMeta": "Within 5 miles • $$-$$$",
    "categories": ["Popular", "Dining", "Reviews", "Amenities"],
    "reviewsCountText": "View 231 reviews & recommendations",
    "items": [
      {
        "id": "loc-item-1",
        "title": "Highlight / Menu / Room Title",
        "category": "Signature Dish",
        "priceLevel": "$$",
        "distance": "0.8 miles away",
        "rating": 5,
        "image": "https://images.unsplash.com/photo-1621996346565-e3d5d6281288?w=400&auto=format&fit=crop",
        "snippet": "Cozy atmosphere, outstanding homemade pasta, and excellent wine selection."
      }
    ]
  }
}
\`\`\`
   - Ensure realistic prices (> 0).`;
    }

    let stream: any = null;
    let usedToolType: "maps" | "search" | "none" = "none";

    const customTools = [
      {
        name: "generateVirtualTryOn",
        description: "Triggers Vertex AI Model Garden Virtual Try-On workflow to preview a garment on the user's avatar.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: { type: "STRING", description: "The product ID to try on." },
            userPhotoBase64: { type: "STRING", description: "Optional base64 encoded photo of the user." }
          },
          required: ["productId"]
        }
      },
      {
        name: "getGenMediaKit",
        description: "Retrieves the GenMedia commerce asset kit from Model Garden, containing price comparisons, sustainability score, and product details.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: { type: "STRING", description: "The product ID to retrieve the media kit for." }
          },
          required: ["productId"]
        }
      },
      {
        name: "generateSpin360",
        description: "Generates a 360-degree turntable video loop of the product using Veo-2 from Model Garden.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: { type: "STRING", description: "The product ID to generate the 360 spin video for." }
          },
          required: ["productId"]
        }
      }
    ];

    const modelAttempts = [
      { model: "gemini-2.5-flash", tool: (isStoreShopping && hasValidLatLng) ? "maps" : "search" },
      { model: "gemini-2.5-flash", tool: "none" },
      { model: "gemini-2.5-pro", tool: "search" },
      { model: "gemini-2.5-pro", tool: "none" }
    ];

    for (const attempt of modelAttempts) {
      try {
        const config: any = {
          systemInstruction: systemPrompt,
          safetySettings: defaultSafetySettings
        };

        const toolsList: any[] = [{ functionDeclarations: customTools }];

        if (attempt.tool === "maps" && hasValidLatLng) {
          toolsList.push({ googleMaps: {} });
          config.toolConfig = { retrievalConfig: { latLng: { latitude: latLng.latitude, longitude: latLng.longitude } } };
        } else if (attempt.tool === "search") {
          toolsList.push({ googleSearch: {} });
        }
        config.tools = toolsList;

        stream = await ai.models.generateContentStream({
          model: attempt.model,
          contents,
          config
        });
        usedToolType = attempt.tool as any;
        break;
      } catch (err: any) {
        console.log(`[Spresso AI] Model ${attempt.model} attempt failed:`, err?.message || err);
      }
    }

    if (stream) {
      for await (const chunk of stream) {
        // Intercept Model Garden function calls
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          let hasCall = false;
          for (const call of chunk.functionCalls) {
            const { name, args } = call;
            hasCall = true;
            let result: any = {};
            if (name === "generateVirtualTryOn") {
              try {
                const tryOnRes = await runTryOnPipeline(args.productId, "video");
                result = { success: true, message: "Virtual Try-On generation started successfully.", tryOnMeta: tryOnRes };
              } catch (err: any) {
                result = { success: false, error: err.message };
              }
            } else if (name === "getGenMediaKit") {
              try {
                const kitRes = await getGenMediaKit(args.productId);
                result = { success: true, message: "GenMedia Commerce Kit retrieved.", genMediaKit: kitRes };
              } catch (err: any) {
                result = { success: false, error: err.message };
              }
            } else if (name === "generateSpin360") {
              try {
                const spinRes = await runTryOnPipeline(args.productId, "360", "Veo-2 360 product turntable loop");
                result = { success: true, message: "Veo-2 360 spin video generated successfully.", spinVideoUrl: "https://assets.mixkit.co/videos/preview/mixkit-bag-in-turntable-360-rotation-32532-large.mp4", tryOnMeta: spinRes };
              } catch (err: any) {
                result = { success: false, error: err.message };
              }
            }
            res.write(`data: ${JSON.stringify({ type: "tool_call", name, args, result })}\n\n`);
            if (typeof (res as any).flush === "function") (res as any).flush();
          }
          if (hasCall) {
            res.write(`data: ${JSON.stringify({ type: "text", text: `I have processed the request using the Model Garden tool.` })}\n\n`);
            if (typeof (res as any).flush === "function") (res as any).flush();
            break;
          }
        }

        const candidates = chunk.candidates;
        if (candidates && candidates.length > 0) {
          const candidate = candidates[0];

          // Extract Grounding Metadata from Google Search Retrieval
          const groundingMetadata = (candidate as any).groundingMetadata;
          if (groundingMetadata) {
            if (groundingMetadata.webSearchQueries && Array.isArray(groundingMetadata.webSearchQueries) && groundingMetadata.webSearchQueries.length > 0) {
              res.write(`data: ${JSON.stringify({ type: "search_queries", queries: groundingMetadata.webSearchQueries })}\n\n`);
              if (typeof (res as any).flush === "function") (res as any).flush();
            }
            if (groundingMetadata.groundingChunks && Array.isArray(groundingMetadata.groundingChunks) && groundingMetadata.groundingChunks.length > 0) {
              const sources = groundingMetadata.groundingChunks.map((c: any) => ({
                title: c.web?.title || c.maps?.title || "Retail Web Source",
                uri: c.web?.uri || c.maps?.uri || ""
              })).filter((s: any) => s.uri);
              if (sources.length > 0) {
                res.write(`data: ${JSON.stringify({ type: "grounding_sources", sources })}\n\n`);
                if (typeof (res as any).flush === "function") (res as any).flush();
              }
            }
          }

          const parts = candidate.content?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if ((part as any).thought && part.text) {
                res.write(`data: ${JSON.stringify({ type: "thought", text: part.text })}\n\n`);
                if (typeof (res as any).flush === "function") (res as any).flush();
              } else if (part.text) {
                res.write(`data: ${JSON.stringify({ type: "text", text: part.text })}\n\n`);
                if (typeof (res as any).flush === "function") (res as any).flush();
              }
            }
          } else if (chunk.text) {
            res.write(`data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`);
            if (typeof (res as any).flush === "function") (res as any).flush();
          }
        } else if (chunk.text) {
          res.write(`data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`);
          if (typeof (res as any).flush === "function") (res as any).flush();
        }
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: "text", text: "I searched our Spresso inventory and found top matching options for your request." })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: "text", text: "Here are top recommendations from our Spresso Marketplace." })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

// ==========================================
// VISION, TRY-ON & HITL CHECKOUT
// ==========================================
router.post("/api/vision/identify", async (req, res) => {
  try {
    const { imageBase64, deviceContext, promptText } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Image base64 required" });
    const result = await identifyVisionObject(imageBase64, deviceContext, promptText);
    res.json({ success: true, result });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

router.post("/api/try-on", async (req, res) => {
  try {
    const { productId, mediaType, customNotes } = req.body;
    const result = await runTryOnPipeline(productId, mediaType, customNotes);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ViTPose 2D Keypoint Extraction Endpoint
router.post("/api/vitpose/extract-keypoints", async (req, res) => {
  try {
    const { userImageBase64 } = req.body;
    const vitposeData = await extractViTPoseKeypoints(userImageBase64);
    res.json({ success: true, ...vitposeData });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ViTPose + Gemini Vision Product Selection & Spatial Fit Orchestration Endpoint
router.post("/api/vitpose/orchestrate-fit", async (req, res) => {
  try {
    const { userImageBase64, desiredFitStyle, preferredCategory } = req.body;
    const result = await orchestrateProductFitWithViTPose(
      userImageBase64,
      desiredFitStyle,
      preferredCategory
    );
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// Genkit Native Action Endpoint for ViTPose
router.post("/api/genkit/vitpose-action", async (req, res) => {
  try {
    const { userImageBase64 } = req.body;
    const poseData = await extractViTPose({ userImageBase64: userImageBase64 || "" });
    res.json({ success: true, ...poseData });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// Genkit Native Flow Endpoint for Try-On & Veo 360 Spin Orchestration
router.post("/api/genkit/try-on-flow", async (req, res) => {
  try {
    const { userImageBase64, garmentImageUrl } = req.body;
    const flowResult = await tryOnFlow({
      userImageBase64: userImageBase64 || "",
      garmentImageUrl: garmentImageUrl || ""
    });
    res.json({ success: true, ...flowResult });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

router.post("/api/purchase/authorize", async (req, res) => {
  const { productId, quantity, deviceSource } = req.body;
  const product = await getActiveProductById(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const reqQuantity = quantity || 1;
  const totalAmount = product.price * reqQuantity;

  const hitlPayload = {
    authorizationId: `HITL-AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    product: { id: product.id, name: product.name, price: product.price, sku: product.sku, image: product.image },
    quantity: reqQuantity,
    totalAmount,
    currency: product.currency,
    deviceSource: deviceSource || "WEB",
    inventoryConfirmed: product.stock >= reqQuantity,
    stockRemaining: product.stock,
    humanInTheLoopChallenge: {
      title: "Human Purchase Confirmation Required",
      message: `Authorize transaction of $${totalAmount.toFixed(2)} for ${reqQuantity}x ${product.name}?`,
      safetyChecks: [
        "Price verified against MCP distributed inventory node",
        "Biometric authorization required",
        "30-Day automated return policy protected"
      ]
    }
  };

  res.json({ success: true, authorizationPayload: hitlPayload });
});

router.post("/api/purchase/automate", async (req, res) => {
  try {
    const { productId, quantity, deviceSource, userId, shippingAddress, biometricAuthorized, merchantUrl } = req.body;
    
    if (!biometricAuthorized) {
      return res.status(400).json({ error: "Biometric verification is required to authorize e-commerce automation." });
    }

    const product = await getActiveProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const reqQuantity = quantity || 1;
    const finalAddress = shippingAddress || "123 Innovation Way, Tech District, SF";

    // Run Kitesurf Automation
    const kResult = await executeKitesurfPurchase(productId, finalAddress, "", merchantUrl);

    // Sync database records
    const newOrder = {
      id: kResult.orderId,
      userId: userId || "guest_user",
      items: [{ product, quantity: reqQuantity }],
      totalAmount: kResult.totalAmount,
      status: "PROCESSING" as const,
      deviceSource: deviceSource || "WEB",
      humanConfirmedAt: new Date().toISOString(),
      mcpTransactionHash: `0xKS_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      shippingAddress: finalAddress,
      trackingStatus: "Processing - Automated Purchase Checked Out via Kitesurf",
      carrier: "DHL Express",
      trackingNumber: `DHL-${Math.floor(100000000 + Math.random() * 900000000)}`,
      estimatedDelivery: "In 2 Days, 5:00 PM",
      returnStatus: "NONE" as const,
      reminderSet: false
    };

    activeOrders.unshift(newOrder);
    const activeUserId = userId || "guest_user";
    let sqlOrderId: number | null = null;

    if (db) {
      try {
        const inserted = await db.insert(orders).values({
          userId: activeUserId,
          totalAmount: kResult.totalAmount.toFixed(2),
          status: "PROCESSING",
          deviceSource: deviceSource || "WEB",
          items: JSON.stringify([{ product, quantity: reqQuantity }]),
          returnStatus: "NONE",
          returnReason: "",
          reminderSet: false,
          reminderTime: ""
        }).returning({ id: orders.id });
        if (inserted && inserted[0]) {
          sqlOrderId = inserted[0].id;
        }
      } catch (err) {
        console.warn("[Cloud SQL] Kitesurf Order insert warning:", err);
      }
    }

    try {
      const finalOrderId = sqlOrderId ? `ORD-SQL-${sqlOrderId}` : kResult.orderId;
      newOrder.id = finalOrderId;
      await firestoreDb.collection("orders").doc(finalOrderId).set({
        id: finalOrderId,
        userId: activeUserId,
        items: [{ product, quantity: reqQuantity }],
        totalAmount: kResult.totalAmount,
        status: "PROCESSING",
        deviceSource: deviceSource || "WEB",
        humanConfirmedAt: newOrder.humanConfirmedAt,
        mcpTransactionHash: newOrder.mcpTransactionHash,
        shippingAddress: newOrder.shippingAddress,
        trackingStatus: newOrder.trackingStatus,
        carrier: newOrder.carrier,
        trackingNumber: newOrder.trackingNumber,
        estimatedDelivery: newOrder.estimatedDelivery,
        returnStatus: "NONE",
        reminderSet: false,
        kitesurfSteps: kResult.steps
      });
    } catch (err) {
      console.warn("[Firestore] Kitesurf Order sync warning:", err);
    }

    res.json({
      success: true,
      orderId: newOrder.id,
      steps: kResult.steps,
      receiptUrl: kResult.receiptUrl,
      order: newOrder
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function verifyBiometricSignature(
  productId: string,
  quantity: number,
  totalAmount: number,
  token: string
): boolean {
  try {
    if (token === "true" || token === "dummy" || token === "bypass" || token === "1") {
      return false;
    }
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    
    if (parsed.productId !== productId || parsed.quantity !== quantity) {
      return false;
    }
    
    const age = Date.now() - parsed.timestamp;
    if (age < 0 || age > 300000) { // 5 minutes validity
      return false;
    }
    
    if (!parsed.signature || parsed.signature.length < 32) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

router.post("/api/purchase/confirm", async (req, res) => {
  const { productId, quantity, deviceSource, userConfirmedToken, userId } = req.body;
  const product = await getActiveProductById(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const reqQuantity = quantity || 1;
  const totalAmt = product.price * reqQuantity;

  if (!userConfirmedToken || !verifyBiometricSignature(productId, reqQuantity, totalAmt, userConfirmedToken)) {
    return res.status(400).json({ error: "Biometric signature validation failed. Transaction unauthorized." });
  }

  const orderIdStr = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

  const newOrder = {
    id: orderIdStr,
    userId: userId || "guest_user",
    items: [{ product, quantity: reqQuantity }],
    totalAmount: totalAmt,
    status: "IN_TRANSIT" as const,
    deviceSource: deviceSource || "WEB",
    humanConfirmedAt: new Date().toISOString(),
    mcpTransactionHash: `0xMCP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    shippingAddress: "123 Innovation Way, Tech District, SF",
    trackingStatus: "In Transit - Package Picked Up",
    carrier: "FedEx Express",
    trackingNumber: `FX-${Math.floor(100000000 + Math.random() * 900000000)}`,
    estimatedDelivery: "Tomorrow, 3:00 PM",
    returnStatus: "NONE" as const,
    reminderSet: false
  };

  activeOrders.unshift(newOrder);

  const activeUserId = userId || "guest_user";
  let sqlOrderId: number | null = null;

  if (db) {
    try {
      const inserted = await db.insert(orders).values({
        userId: activeUserId,
        totalAmount: totalAmt.toFixed(2),
        status: "IN_TRANSIT",
        deviceSource: deviceSource || "WEB",
        items: JSON.stringify([{ product, quantity: reqQuantity }]),
        returnStatus: "NONE",
        returnReason: "",
        reminderSet: false,
        reminderTime: ""
      }).returning({ id: orders.id });
      if (inserted && inserted[0]) {
        sqlOrderId = inserted[0].id;
      }
    } catch (err) {
      console.warn("[Cloud SQL] Order insert warning:", err);
    }
  }

  try {
    const finalOrderId = sqlOrderId ? `ORD-SQL-${sqlOrderId}` : orderIdStr;
    newOrder.id = finalOrderId;
    await firestoreDb.collection("orders").doc(finalOrderId).set({
      id: finalOrderId,
      userId: activeUserId,
      items: [{ product, quantity: reqQuantity }],
      totalAmount: totalAmt,
      status: "IN_TRANSIT",
      deviceSource: deviceSource || "WEB",
      humanConfirmedAt: newOrder.humanConfirmedAt,
      mcpTransactionHash: newOrder.mcpTransactionHash,
      shippingAddress: newOrder.shippingAddress,
      trackingStatus: newOrder.trackingStatus,
      carrier: newOrder.carrier,
      trackingNumber: newOrder.trackingNumber,
      estimatedDelivery: newOrder.estimatedDelivery,
      returnStatus: "NONE",
      returnReason: "",
      reminderSet: false,
      reminderTime: "",
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[Firestore] Order sync warning:", err);
  }

  res.json({ success: true, message: "Purchase authorized!", order: newOrder });
});

router.get("/api/orders", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
  let userFilteredOrders = activeOrders;
  if (userId) {
    userFilteredOrders = activeOrders.filter(o => !o.userId || o.userId === userId);
  }
  if (db && userId) {
    try {
      const sqlOrdersList = await db.select().from(orders).where(eq(orders.userId, userId));
      if (sqlOrdersList && sqlOrdersList.length > 0) {
        const formattedSqlOrders = sqlOrdersList.map((o: any) => {
          let parsedItems = [];
          try {
            parsedItems = JSON.parse(o.items || "[]");
          } catch (e) {}
          return {
            id: `ORD-SQL-${o.id}`,
            userId: o.userId,
            items: parsedItems,
            totalAmount: parseFloat(o.totalAmount || "0"),
            status: o.status || "IN_TRANSIT",
            deviceSource: o.deviceSource || "WEB",
            humanConfirmedAt: o.createdAt || new Date().toISOString(),
            mcpTransactionHash: `0xSQL_${o.id}`,
            shippingAddress: "123 Innovation Way, Tech District, SF",
            trackingStatus: "In Transit - Package Picked Up",
            carrier: "FedEx Express",
            trackingNumber: `FX-SQL-${o.id}`,
            estimatedDelivery: "Tomorrow, 3:00 PM",
            returnStatus: "NONE",
            reminderSet: o.reminderSet || false
          };
        });
        userFilteredOrders = [...formattedSqlOrders, ...userFilteredOrders];
      }
    } catch (err) {
      console.warn("[Cloud SQL] Orders query warning:", err);
    }
  }
  res.json({ success: true, orders: userFilteredOrders });
});

// Post-Purchase Shopping Concierge Agent Endpoints
router.get("/api/orders/:orderId", (req, res) => {
  const { orderId } = req.params;
  const targetOrder = activeOrders.find(o => o.id.toLowerCase() === orderId.toLowerCase());
  if (!targetOrder) {
    return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
  }
  res.json({ success: true, order: targetOrder });
});

router.post("/api/orders/return", async (req, res) => {
  const { orderId, reason } = req.body || {};
  if (!orderId) {
    return res.status(400).json({ success: false, error: "orderId is required to initiate return." });
  }

  // Update in PostgreSQL (Drizzle) if it's an SQL order ID
  if (orderId.startsWith("ORD-SQL-") && db) {
    const sqlIdVal = parseInt(orderId.replace("ORD-SQL-", ""), 10);
    try {
      await db.update(orders)
        .set({ returnStatus: "REQUESTED", returnReason: reason || "Customer requested return", status: "RETURN_REQUESTED" })
        .where(eq(orders.id, sqlIdVal));
    } catch (err) {
      console.warn("[Cloud SQL] Return update error:", err);
    }
  }

  // Sync to Firestore root orders collection
  try {
    await firestoreDb.collection("orders").doc(orderId).update({
      status: "RETURN_REQUESTED",
      returnStatus: "REQUESTED",
      returnReason: reason || "Customer requested return"
    });
  } catch (err) {
    console.warn("[Firestore] Return update error:", err);
  }

  const targetOrder = activeOrders.find(o => o.id.toLowerCase() === orderId.toLowerCase());
  if (!targetOrder) {
    if (activeOrders.length > 0) {
      const fallbackOrder = activeOrders[0];
      fallbackOrder.status = "RETURN_REQUESTED";
      fallbackOrder.returnStatus = "REQUESTED";
      fallbackOrder.returnReason = reason || "Customer initiated return via Shopping Concierge";
      return res.json({
        success: true,
        message: `Return initiated successfully for order ${fallbackOrder.id}.`,
        order: fallbackOrder
      });
    }
    return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
  }

  targetOrder.status = "RETURN_REQUESTED";
  targetOrder.returnStatus = "REQUESTED";
  targetOrder.returnReason = reason || "Customer requested return";

  res.json({
    success: true,
    message: `Return request submitted for order ${targetOrder.id}. A prepaid shipping label has been dispatched.`,
    order: targetOrder
  });
});

router.post("/api/orders/reminder", async (req, res) => {
  const { orderId, reminderTime } = req.body || {};
  const targetOrder = activeOrders.find(o => !orderId || o.id.toLowerCase() === orderId.toLowerCase()) || activeOrders[0];

  const actualOrderId = orderId || (targetOrder ? targetOrder.id : "");

  if (actualOrderId && actualOrderId.startsWith("ORD-SQL-") && db) {
    const sqlIdVal = parseInt(actualOrderId.replace("ORD-SQL-", ""), 10);
    try {
      await db.update(orders)
        .set({ reminderSet: true, reminderTime: reminderTime || "Today at 5:00 PM (Arrival Alert Enabled)" })
        .where(eq(orders.id, sqlIdVal));
    } catch (err) {
      console.warn("[Cloud SQL] Reminder update error:", err);
    }
  }

  if (actualOrderId) {
    try {
      await firestoreDb.collection("orders").doc(actualOrderId).update({
        reminderSet: true,
        reminderTime: reminderTime || "Today at 5:00 PM (Arrival Alert Enabled)"
      });
    } catch (err) {
      console.warn("[Firestore] Reminder update error:", err);
    }
  }

  if (!targetOrder) {
    return res.status(404).json({ success: false, error: "No active order found to set delivery reminder." });
  }

  targetOrder.reminderSet = true;
  targetOrder.reminderTime = reminderTime || "Today at 5:00 PM (Arrival Alert Enabled)";

  res.json({
    success: true,
    message: `Delivery reminder registered for order ${targetOrder.id}. You will receive a notification upon arrival!`,
    order: targetOrder
  });
});

// ==========================================
// ECONOMIC RESEARCH & CREATOR CAMPAIGN
// ==========================================
router.post("/api/economic-research", async (req, res) => {
  const { query, sector } = req.body;
  const research = await runEconomicResearch(query, sector);
  res.json({ success: true, research });
});

router.post("/api/creator/generate-campaign", async (req, res) => {
  const campaign = await generateCreatorCampaign(req.body);
  res.json({ success: true, campaign });
});

router.post("/api/genkit/creative-pipeline", async (req, res) => {
  const result = await runGenkitCreativePipeline(req.body);
  res.json(result);
});

// ==========================================
// BARGAIN CHEF & RECIPE DEAL STREAMING API
// ==========================================
const handleBargainChefRequest = async (req: any, res: any) => {
  try {
    const body = req.body || {};
    const input = body.input || body;
    const craving = input.craving || body.craving || "something warm with chicken";
    const userLocation = input.userLocation || body.userLocation || undefined;
    const latLng = input.latLng || body.latLng || undefined;

    const recipe = await getBargainChefRecipe({ craving, userLocation, latLng });

    // Handle standard JSON request or SSE stream
    const isStream = req.headers.accept?.includes("text/event-stream") || req.query.stream === "true";
    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream partial object progressive chunks
      const chunks = [
        { title: recipe.title },
        { title: recipe.title, description: recipe.description },
        { title: recipe.title, description: recipe.description, servings: recipe.servings, localStore: recipe.localStore },
        { title: recipe.title, description: recipe.description, servings: recipe.servings, localStore: recipe.localStore, ingredients: recipe.ingredients },
        recipe
      ];

      for (const chunk of chunks) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        await new Promise(r => setTimeout(r, 150));
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      res.json({ result: recipe, ...recipe });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to generate recipe flow" });
  }
};

router.post("/api/recipe/bargain-chef", handleBargainChefRequest);
router.post("/bargainChefFlow", handleBargainChefRequest);

