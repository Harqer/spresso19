import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/** Bounded, ordered event page for an owner-checked session. */
export const eventsAfterInternal = internalQuery({
  args: { sessionId: v.id("merchantBrowserSessions"), afterSeq: v.number(), limit: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("merchantBrowserEvents")
      .withIndex("by_session_and_sequence", (q) =>
        q.eq("sessionId", args.sessionId).gt("sequence", args.afterSeq),
      )
      .take(args.limit);
    return rows.map((row) => ({
      eventId: row._id,
      sequence: row.sequence,
      eventType: row.eventType,
      summary: row.summary,
      createdAt: row.createdAt,
    }));
  },
});
