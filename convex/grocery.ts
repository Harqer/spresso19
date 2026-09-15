import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireFirebaseIdentity } from "./lib/identity";

/**
 * Grocery domain — the single Convex owner of the shopping list.
 *
 * Legacy Firebase Data Connect stored one list per user with items; this
 * module keeps the same shape: one implicit list per owner (created on first
 * read), items with name/category/purchase state. `seedFromLegacy` imports
 * the Data Connect rows keyed by legacy id.
 */

const groceryItem = v.object({
  id: v.id("groceryItems"),
  name: v.string(),
  category: v.string(),
  checked: v.boolean(),
});

function normalizeCategory(raw: string): string {
  const trimmed = raw.trim().slice(0, 60);
  return trimmed.length > 0 ? trimmed : "Other";
}

export const getMyList = query({
  args: {},
  returns: v.object({
    items: v.array(groceryItem),
  }),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const items = await ctx.db
      .query("groceryItems")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(500);
    return {
      items: items.map((row) => ({
        id: row._id,
        name: row.name,
        category: row.category,
        checked: row.checked,
      })),
    };
  },
});

export const addItem = mutation({
  args: { name: v.string(), category: v.string() },
  returns: v.id("groceryItems"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const name = args.name.trim();
    if (!name || name.length > 200) throw new Error("An item name is required.");
    return ctx.db.insert("groceryItems", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      category: normalizeCategory(args.category),
      checked: false,
      createdAt: Date.now(),
    });
  },
});

export const setChecked = mutation({
  args: { itemId: v.id("groceryItems"), checked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Grocery item not found for this user.");
    }
    await ctx.db.patch(args.itemId, { checked: args.checked });
    return null;
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("groceryItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Grocery item not found for this user.");
    }
    await ctx.db.delete(args.itemId);
    return null;
  },
});

/** Idempotent migration seed for Data Connect grocery rows. */
export const seedFromLegacy = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    items: v.array(v.object({
      legacyId: v.string(),
      productName: v.string(),
      isPurchased: v.boolean(),
    })),
  },
  returns: v.object({ items: v.number() }),
  handler: async (ctx, args) => {
    let count = 0;
    for (const row of args.items) {
      const existing = await ctx.db
        .query("groceryItems")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId))
        .unique();
      const values = {
        tokenIdentifier: args.tokenIdentifier,
        name: row.productName,
        category: "Other",
        checked: row.isPurchased,
      };
      if (existing) {
        await ctx.db.patch(existing._id, { ...values, createdAt: existing.createdAt });
      } else {
        await ctx.db.insert("groceryItems", { ...values, createdAt: Date.now(), legacyId: row.legacyId });
      }
      count++;
    }
    return { items: count };
  },
});
