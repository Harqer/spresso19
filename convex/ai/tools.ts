import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../_generated/api";

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
      return ctx.runAction(internal.discovery.searchForAgent, {
        tokenIdentifier: ctx.userId,
        query: input.query,
        ...(input.location ? { location: input.location } : {}),
      });
    },
  }),
};
