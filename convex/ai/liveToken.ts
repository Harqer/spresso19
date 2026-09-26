"use node";

import { action, env } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { requireFirebaseIdentity } from "../lib/identity";

/**
 * Ephemeral-token exchange for the Gemini Live API WebSocket.
 *
 * The API key stays on the server. The REST AuthToken API accepts
 * `bidiGenerateContentSetup` and a comma-separated fieldMask. The mask locks
 * the server-owned setup while leaving sessionResumption configurable for
 * provider-issued reconnect handles.
 */
const LiveTokenResponseSchema = z.object({ name: z.string().min(1) });

const LIVE_TOKEN_URL = "https://generativelanguage.googleapis.com/v1beta/auth_tokens";
const LIVE_MODEL = "models/gemini-3.8-live";
const LIVE_ASSISTANT_INSTRUCTION =
  "You are Spresso's concise, safety-conscious live shopping assistant. Help the user discover products using the camera and microphone.";
const LIVE_TIMEOUT_MS = 15_000;
const LIVE_TOKEN_FIELD_MASK =
  "model,generationConfig,systemInstruction,tools,inputAudioTranscription,outputAudioTranscription";

export function liveTokenRequestBody() {
  return {
    uses: 1,
    bidiGenerateContentSetup: {
      model: LIVE_MODEL,
      generationConfig: { responseModalities: ["AUDIO"] },
      tools: [],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: LIVE_ASSISTANT_INSTRUCTION }] },
    },
    fieldMask: LIVE_TOKEN_FIELD_MASK,
  };
}

export const generateLiveApiToken = action({
  args: {},
  returns: v.object({ token: v.string() }),
  handler: async (ctx) => {
    await requireFirebaseIdentity(ctx);
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("LIVE_PROVIDER_UNCONFIGURED: live assistant is unavailable because GEMINI_API_KEY is not configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
    try {
      const response = await fetch(LIVE_TOKEN_URL, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(liveTokenRequestBody()),
      });
      if (!response.ok) throw new Error(`Live token provider returned HTTP ${response.status}.`);
      const data = LiveTokenResponseSchema.parse(await response.json());
      return { token: data.name };
    } catch (cause) {
      if (cause instanceof z.ZodError) throw new Error("Live token provider returned malformed content.");
      if (cause instanceof Error && (cause.message.startsWith("LIVE_PROVIDER_UNCONFIGURED") || cause.message.startsWith("Live token provider"))) throw cause;
      throw new Error(`Live assistant token is temporarily unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      clearTimeout(timeout);
    }
  },
});
