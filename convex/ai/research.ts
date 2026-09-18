"use node";

import Parallel from "parallel-web";
import { env, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const evidence = v.object({
  title: v.string(),
  url: v.string(),
  snippet: v.string(),
});

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeEvidence(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  const url = httpsUrl(item.url ?? item.link ?? item.source_url);
  const title = typeof (item.title ?? item.name) === "string" ? String(item.title ?? item.name).trim() : "";
  const snippet = typeof (item.snippet ?? item.description ?? item.text) === "string"
    ? String(item.snippet ?? item.description ?? item.text).trim()
    : "";
  if (!url || !title || !snippet) return undefined;
  return { title: title.slice(0, 240), url, snippet: snippet.slice(0, 2000) };
}

/**
 * Backend-only research capability. Agent tools call this internal action;
 * clients never receive provider credentials or provider-specific controls.
 * Results are bounded, HTTPS-only evidence so the Agent can cite rather than
 * invent claims. Agent message persistence provides the durable tool result.
 */
export const search = internalAction({
  args: {
    tokenIdentifier: v.string(),
    query: v.string(),
  },
  returns: v.object({
    provider: v.literal("parallel"),
    query: v.string(),
    evidence: v.array(evidence),
  }),
  handler: async (ctx, args) => {
    const query = args.query.trim().replace(/\s+/g, " ");
    if (query.length < 2 || query.length > 400) throw new Error("A valid research query is required.");
    if (!env.PARALLEL_API_KEY) throw new Error("Research capability is not configured.");

    await ctx.runMutation(internal.rateLimits.consume, {
      key: args.tokenIdentifier,
      name: "researchSearch",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const client = new Parallel({ apiKey: env.PARALLEL_API_KEY });
      const result = await client.search(
        { objective: query, search_queries: [query], mode: "advanced" },
        { signal: controller.signal },
      );
      const raw = (result as { results?: unknown }).results;
      const normalized = Array.isArray(raw)
        ? raw.map(normalizeEvidence).filter((item): item is { title: string; url: string; snippet: string } => item !== undefined).slice(0, 10)
        : [];
      if (normalized.length === 0) throw new Error("Research provider returned no citable evidence.");
      return { provider: "parallel" as const, query, evidence: normalized };
    } finally {
      clearTimeout(timeout);
    }
  },
});
