import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { router } from "./server/routes.ts";
import { initDbSchema } from "./src/db/index.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Mount modular API routes
app.use(router);

// Shared Gemini AI instance for server
const getGeminiAI = () => {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Vite middleware / production static file serving
async function startServer() {
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

  const server = http.createServer(app);

  // Setup WebSocket Server for Live Real-time Camera & Voice Cooking Agent
  const wss = new WebSocketServer({ server, path: "/api/live-chef" });

  wss.on("connection", async (clientWs) => {
    console.log("[Live Chef WS] Client connected for real-time cooking & camera assistant");
    const ai = getGeminiAI();
    let session: any = null;

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: "You are Bargain Chef AI, a real-time voice and video cooking assistant. You observe the user's kitchen counter or cooking ingredients via camera video stream, listen to their questions via live mic audio, and speak back with friendly, real-time step-by-step culinary guidance, ingredient substitutions, and local bargain grocery tips.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "audio", audio }));
            }

            const textPart = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (textPart && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "text", text: textPart }));
            }

            if (message.serverContent?.interrupted && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "interrupted", interrupted: true }));
            }
          },
          onerror: (err: any) => {
            console.warn("[Live Chef] Gemini Live session error:", err?.message || err);
            if (clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: "error", error: "Session error from Gemini Live" }));
            }
          },
          onclose: () => {
            console.log("[Live Chef] Gemini Live session closed");
          }
        },
      });

      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ type: "ready", message: "Connected to Bargain Chef AI Live Assistant" }));
      }
    } catch (err: any) {
      console.error("[Live Chef] Failed to connect to Gemini Live:", err);
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
      } catch (e) {
        console.warn("[Live Chef] Error handling message:", e);
      }
    });

    clientWs.on("close", () => {
      console.log("[Live Chef WS] Client disconnected");
      if (session) {
        try {
          session.close();
        } catch (e) {}
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Spresso AI Personal Shopper Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

