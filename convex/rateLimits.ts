import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const limiter = new RateLimiter(components.rateLimiter, {
  discoverySearch: { kind: "token bucket", rate: 12, period: MINUTE, capacity: 4 },
  merchantVerification: { kind: "token bucket", rate: 12, period: MINUTE, capacity: 3 },
  visualSearch: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 2 },
  receiptParsing: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 2 },
});

/**
 * Consume a user-scoped budget before an Action calls an external provider.
 * Keeping this in a mutation is intentional: rate-limiter consumption is a
 * transactional write and Actions cannot call `limit` directly.
 */
export const consume = internalMutation({
  args: {
    key: v.string(),
    name: v.union(
      v.literal("discoverySearch"),
      v.literal("merchantVerification"),
      v.literal("visualSearch"),
      v.literal("receiptParsing"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await limiter.limit(ctx, args.name, { key: args.key });
    if (!result.ok) {
      throw new Error("Provider request rate limit exceeded. Please try again later.");
    }
    return null;
  },
});
