"use node";

import { action, env } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { requireFirebaseIdentity } from "../lib/identity";

/**
 * Ephemeral-token exchange for the Gemini Live API WebSocket.
 *
 * The single Convex owner of this boundary (the legacy Firebase callable
 * `generateLiveApiToken` enforced App Check + auth; this action enforces the
 * Firebase identity). The API key never reaches the client — only a
 * single-use, short-lived token scoped by the server-owned constraints does.
 */

const LiveTokenResponseSchema = z.object({ name: z.string().min(1) });

const LIVE_TOKEN_URL = "https://generativelanguage.googleapis.com/v1beta/auth_tokens";
const LIVE_MODEL = "models/gemini-3.1-flash-live-preview";
const LIVE_TIMEOUT_MS = 15_000;

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
        body: JSON.stringify({
          uses: 1,
          liveConnectConstraints: {
            model: LIVE_MODEL,
            config: {
              responseModalities: ["AUDIO"],
              sessionResumption: {},
              // Server-owned persona: the constraint config takes precedence
              // over client setup, so the client cannot alter or omit the
              // system instruction.
              systemInstruction: {
                parts: [{ text: "You are Spresso's concise, safety-conscious live cooking assistant. Help the user cook with the camera and microphone." }],
              },
            },
          },
        }),
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
