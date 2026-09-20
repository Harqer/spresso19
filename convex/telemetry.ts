import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

export const recordInteraction = mutation({
  args: {
    productId: v.string(),
    action: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const productId = args.productId.trim();
    const action = args.action.trim();
    if (!productId || productId.length > 240) throw new Error("A valid interaction subject is required.");
    if (!action || action.length > 120) throw new Error("A valid interaction action is required.");
    await ctx.db.insert("interactionEvents", {
      tokenIdentifier: identity.tokenIdentifier,
      productId,
      action,
      createdAt: Date.now(),
    });
    return null;
  },
});
