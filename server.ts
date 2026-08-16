import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initDbSchema, initPool } from "./src/db/index.ts";
import { getSecret, initializeSecrets } from "./src/lib/secrets.ts";
import jwt from "jsonwebtoken";
import { router } from "./server/routes.ts";

const app = express();
app.use(express.json({ limit: "6mb", strict: true }));
app.use(router);

// Structured JSON Logging & PII Masking Service for Stackdriver compatibility
const SENSITIVE_KEYS = [
  "password", "token", "apikey", "private_key", "database_url",
  "sql_password", "pgpassword", "authorization", "signedurl", "saveurl", "jwt"
];

export function maskPii(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === "string") {
    if (obj.includes("-----BEGIN PRIVATE KEY-----")) {
      return "[MASKED_PRIVATE_KEY]";
    }
    if (obj.match(/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/)) {
      return "[MASKED_JWT]";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskPii);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
          result[key] = "[MASKED_PII_OR_SECRET]";
        } else {
          result[key] = maskPii(obj[key]);
        }
      }
    }
    return result;
  }
  return obj;
}

export function logStructured(severity: "INFO" | "WARNING" | "ERROR", message: string, payload?: any) {
  let details = payload;
  if (payload instanceof Error) {
    let cleanMessage = payload.message;
    let cleanStack = payload.stack || "";
    for (const sk of SENSITIVE_KEYS) {
      const regex = new RegExp(sk + "[a-zA-Z0-9_\\-\\s:=]*", "gi");
      cleanMessage = cleanMessage.replace(regex, `[MASKED_${sk.toUpperCase()}]`);
      cleanStack = cleanStack.replace(regex, `[MASKED_${sk.toUpperCase()}]`);
    }
    cleanStack = cleanStack.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[MASKED_JWT_STACK]");
    details = {
      errorMessage: cleanMessage,
      stack: cleanStack
    };
  }
  const logObj = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    details: details ? maskPii(details) : undefined
  };
  console.log(JSON.stringify(logObj));
}

// Orchestrator Liveness and Readiness Probes
app.get("/healthz", (req, res) => {
  // Liveness Check: verifies container lifecycle up-state. No external dependencies.
  res.status(200).send("OK");
});

app.get("/readyz", async (req, res) => {
  // Readiness Check: verifies Secret Manager caching + database connectivity pool health
  try {
    const geminiKey = await getSecret("GEMINI_API_KEY");
    if (!geminiKey) {
      return res.status(500).send("Secrets not loaded");
    }
    const pool = initPool();
    await pool.query("SELECT 1");
    res.status(200).send("Ready");
  } catch (err: any) {
    logStructured("ERROR", "Container readiness probe failed", err);
    res.status(500).send("Unhealthy");
  }
});

// Google Wallet Pass Generator Endpoint
app.post("/api/wallet/pass", async (req, res) => {
  try {
    const { orderId, userUid, totalAmount, title } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    const passId = `spresso_order_${orderId}`;
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || "3388000000022387192";

    const serviceAccountJson = await getSecret("GOOGLE_WALLET_SERVICE_ACCOUNT_KEY");
    const serviceAccount = JSON.parse(serviceAccountJson);
    const privateKey = serviceAccount.private_key;
    const clientEmail = serviceAccount.client_email;
    const privateKeyId = serviceAccount.private_key_id;

    // Secure PEM private key string newline resolution
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

    const token = jwt.sign(
      {
        iss: clientEmail,
        aud: "google",
        typ: "savetowallet",
        iat: Math.floor(Date.now() / 1000),
        payload: {
          genericObjects: [
            {
              id: `${issuerId}.${passId}`,
              classId: `${issuerId}.spresso_order_receipt`,
              logo: {
                sourceUri: { uri: "https://spresso-5561f.web.app/spresso_icon.svg" },
                contentDescription: { defaultValue: { language: "en", value: "Spresso Store Logo" } }
              },
              cardTitle: { defaultValue: { language: "en", value: "Spresso VIP Order Receipt" } },
              header: { defaultValue: { language: "en", value: title || `Order #${orderId.substring(0, 8)}` } },
              subheader: { defaultValue: { language: "en", value: `Total: $${(totalAmount || 0).toFixed(2)}` } },
              textModulesData: [
                { header: "ORDER ID", body: orderId },
                { header: "USER UID", body: userUid || "Anonymous" }
              ],
              barcode: {
                type: "QR_CODE",
                value: `SPRESSO-ORDER-${orderId}`,
                alternateText: orderId
              },
              hexBackgroundColor: "#18211e"
            }
          ]
        }
      },
      formattedPrivateKey,
      {
        algorithm: "RS256",
        keyid: privateKeyId
      }
    );

    const googleWalletUrl = `https://pay.google.com/gp/v/save/${token}`;

    return res.json({
      success: true,
      passId,
      saveUrl: googleWalletUrl
    });
  } catch (err: any) {
    logStructured("ERROR", "Failed to generate Google Wallet pass", err);
    return res.status(500).json({ error: "Internal server error generating wallet pass" });
  }
});

// Shared Gemini AI instance for server
const getGeminiAI = async () => {
  const geminiApiKey = await getSecret("GEMINI_API_KEY");
  return new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Vite middleware / production static file serving and lifecycle management
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const requiredSecrets = ["GEMINI_API_KEY", "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY", "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"];
  if (isProduction) {
    requiredSecrets.push("DATABASE_PASSWORD");
  }

  // Fail-fast on boot: validate and load required secrets from GCP Secret Manager
  await initializeSecrets(requiredSecrets);
  process.env.GEMINI_API_KEY = await getSecret("GEMINI_API_KEY");

  if (isProduction) {
    // Populate DB settings for pg Pool UNIX socket paths
    process.env.SQL_PASSWORD = await getSecret("DATABASE_PASSWORD");
    process.env.DB_PASSWORD = process.env.SQL_PASSWORD;
  }

  // Initialize and validate postgres tables schema
  await initDbSchema();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = http.createServer(app);

  // Setup WebSocket Server for Live Real-time Camera & Voice Cooking Agent
  const wss = new WebSocketServer({ server, path: "/api/live-chef" });

  wss.on("connection", async (clientWs) => {
    let session: any = null;

    try {
      const ai = await getGeminiAI();
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: "You are Chef AI, a real-time voice and video cooking assistant. You observe the user's kitchen counter or cooking ingredients via camera video stream, listen to their questions via live mic audio, and speak back with friendly, real-time step-by-step culinary guidance, ingredient substitutions, and local bargain grocery tips.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data && clientWs.readyState === 1) {
                  clientWs.send(JSON.stringify({ type: "audio", audio: part.inlineData.data }));
                }
                if (part.text && clientWs.readyState === 1) {
                  clientWs.send(JSON.stringify({ type: "text", text: part.text }));
                }
              }
            }

            if (content?.interrupted && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "interrupted", interrupted: true }));
            }
          },
          onerror: (err: any) => {
            if (clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "error", error: "Session error from Gemini Live" }));
            }
          },
          onclose: () => {
            // Session closed — no action needed, client will handle reconnect
          }
        },
      });

      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ type: "ready", message: "Connected to Chef AI Live Assistant" }));
      }
    } catch (err: any) {
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ type: "error", error: err?.message || "Failed to initialize Live Assistant" }));
      }
      return;
    }

    clientWs.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.audio && session) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" }
          });
        }

        if (msg.image && session) {
          const cleanBase64 = msg.image.replace(/^data:image\/\w+;base64,/, "");
          session.sendRealtimeInput({
            video: { data: cleanBase64, mimeType: "image/jpeg" }
          });
        }

        if (msg.text && session) {
          session.sendRealtimeInput({
            text: msg.text
          });
        }
      } catch (e: any) {
        // Malformed client message
        console.warn("WebSocket client message error:", e.message);
      }
    });

    clientWs.on("close", () => {
      if (session) {
        try {
          session.close();
        } catch (e: any) {
          console.warn("Error closing Gemini session:", e.message);
        }
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    logStructured("INFO", `Spresso19 server listening on port ${PORT}`);
  });

  // Graceful shutdown lifecycle management (SIGTERM/SIGINT) for GKE and Cloud Run
  const gracefulShutdown = () => {
    logStructured("INFO", "SIGTERM/SIGINT signal received. Draining connections for graceful shutdown.");
    
    server.close(async () => {
      logStructured("INFO", "All in-flight requests drained. Closing database connection pools.");
      try {
        const pool = initPool();
        await pool.end();
        logStructured("INFO", "Database pool connections closed successfully. Server shutting down.");
      } catch (poolErr: any) {
        logStructured("ERROR", "Error encountered closing connection pool", poolErr);
      }
      process.exit(0);
    });

    // Enforce shutdown threshold limit (15 seconds) to prevent container timeouts
    setTimeout(() => {
      logStructured("WARNING", "Shutdown threshold limit exceeded. Forcing container exit.");
      process.exit(1);
    }, 15000);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

startServer();
broken_code_test()
