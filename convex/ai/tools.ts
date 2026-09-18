import { createTool } from "@convex-dev/agent";
import type { FunctionReference } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";

// Keep generated internal references opaque here so the API type graph does not
// recurse through this module's Agent tool definitions.
type InternalActionReference = FunctionReference<
  "action",
  "internal",
  Record<string, string | undefined>,
  unknown
>;

const discoverySearch = internal.discovery.searchForAgent as InternalActionReference;
const researchSearch = internal.ai.research.search as InternalActionReference;

/**
 * Agent tools are semantic capabilities, not provider APIs. They execute only
 * inside Convex actions and carry the verified Agent user/thread context into
 * internal owner-scoped operations.
 */
export const commerceTools = {
  searchExternalListings: createTool({
    description:
      "Search verified external merchant listings for products matching the user's request. Spresso does not own inventory; return only provider-grounded listings.",
    inputSchema: z.object({
      query: z.string().trim().min(2).max(240),
      location: z.string().trim().min(1).max(160).optional(),
    }).strict(),
    execute: async (ctx, input) => {
      if (!ctx.userId) throw new Error("Agent user context is required for discovery.");
      return ctx.runAction(discoverySearch, {
        tokenIdentifier: ctx.userId,
        query: input.query,
        ...(input.location ? { location: input.location } : {}),
      });
    },
  }),
  researchEvidence: createTool({
    description:
      "Research a question using Parallel and return bounded HTTPS evidence with titles, URLs, and snippets. Cite this evidence and do not invent sources.",
    inputSchema: z.object({
      query: z.string().trim().min(2).max(400),
    }).strict(),
    execute: async (ctx, input) => {
      if (!ctx.userId) throw new Error("Agent user context is required for research.");
      return ctx.runAction(researchSearch, {
        tokenIdentifier: ctx.userId,
        query: input.query,
      });
    },
  }),
};
