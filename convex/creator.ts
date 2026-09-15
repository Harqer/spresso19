import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireFirebaseIdentity } from "./lib/identity";

/**
 * Curated AI reference data — the single Convex owner of quick prompts and
 * creator templates/agents metadata.
 *
 * Legacy Firebase Functions served these tables from Firestore collections
 * (`quick_prompts`, `creator_templates`) with identical field names. They are
 * now first-class Convex tables seeded by `seedFromLegacy` during data
 * migration, and only this module reads them.
 */

const promptRow = v.object({
  id: v.id("quickPrompts"),
  prompt: v.string(),
  title: v.string(),
  subtitle: v.string(),
  icon: v.string(),
});

const templateRow = v.object({
  id: v.id("creatorTemplates"),
  name: v.string(),
  creator: v.string(),
  category: v.string(),
  description: v.string(),
  icon: v.string(),
  promptExample: v.string(),
});

const agentRow = v.object({
  id: v.id("creatorAgents"),
  title: v.string(),
  subtitle: v.string(),
  icon: v.string(),
  color: v.string(),
  bgColor: v.string(),
  borderColor: v.string(),
  capabilities: v.array(v.string()),
  quickPrompts: v.array(v.object({ label: v.string(), prompt: v.string() })),
});

export const listQuickPrompts = query({
  args: {},
  returns: v.object({ prompts: v.array(promptRow) }),
  handler: async (ctx) => {
    await requireFirebaseIdentity(ctx);
    const rows = await ctx.db.query("quickPrompts").withIndex("by_creation_time").order("asc").take(50);
    return {
      prompts: rows.map((row) => ({
        id: row._id,
        prompt: row.prompt,
        title: row.title,
        subtitle: row.subtitle,
        icon: row.icon,
      })),
    };
  },
});

export const listCreatorTemplates = query({
  args: {},
  returns: v.object({ templates: v.array(templateRow) }),
  handler: async (ctx) => {
    await requireFirebaseIdentity(ctx);
    const rows = await ctx.db.query("creatorTemplates").withIndex("by_creation_time").order("asc").take(100);
    return {
      templates: rows.map((row) => ({
        id: row._id,
        name: row.name,
        creator: row.creator,
        category: row.category,
        description: row.description,
        icon: row.icon,
        promptExample: row.promptExample,
      })),
    };
  },
});

export const listCreatorAgents = query({
  args: {},
  returns: v.object({ agents: v.array(agentRow) }),
  handler: async (ctx) => {
    await requireFirebaseIdentity(ctx);
    const rows = await ctx.db.query("creatorAgents").withIndex("by_creation_time").order("asc").take(50);
    return {
      agents: rows.map((row) => ({
        id: row._id,
        title: row.title,
        subtitle: row.subtitle,
        icon: row.icon,
        color: row.color,
        bgColor: row.bgColor,
        borderColor: row.borderColor,
        capabilities: row.capabilities,
        quickPrompts: row.quickPrompts,
      })),
    };
  },
});

/**
 * Idempotent migration seed for the Firestore reference-data collections.
 * Rows are keyed by their legacy document id; re-running the seed updates in
 * place instead of duplicating. Callable only via `npx convex run`.
 */
export const seedFromLegacy = internalMutation({
  args: {
    quickPrompts: v.optional(v.array(v.object({
      legacyId: v.string(),
      prompt: v.string(),
      title: v.string(),
      subtitle: v.string(),
      icon: v.string(),
    }))),
    creatorTemplates: v.optional(v.array(v.object({
      legacyId: v.string(),
      name: v.string(),
      creator: v.string(),
      category: v.string(),
      description: v.string(),
      icon: v.string(),
      promptExample: v.string(),
    }))),
    creatorAgents: v.optional(v.array(v.object({
      legacyId: v.string(),
      title: v.string(),
      subtitle: v.string(),
      icon: v.string(),
      color: v.string(),
      bgColor: v.string(),
      borderColor: v.string(),
      capabilities: v.array(v.string()),
      quickPrompts: v.array(v.object({ label: v.string(), prompt: v.string() })),
    }))),
  },
  returns: v.object({
    quickPrompts: v.number(),
    creatorTemplates: v.number(),
    creatorAgents: v.number(),
  }),
  handler: async (ctx, args) => {
    async function upsert(
      table: "quickPrompts" | "creatorTemplates" | "creatorAgents",
      legacyId: string,
      values: Record<string, unknown>,
    ): Promise<void> {
      const existing = await ctx.db
        .query(table)
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, values);
      } else {
        await ctx.db.insert(table, { legacyId, ...values } as never);
      }
    }

    let promptCount = 0;
    for (const [index, row] of (args.quickPrompts ?? []).entries()) {
      const { legacyId, ...values } = row;
      await upsert("quickPrompts", legacyId, { ...values, sortOrder: index });
      promptCount++;
    }
    let templateCount = 0;
    for (const [index, row] of (args.creatorTemplates ?? []).entries()) {
      const { legacyId, ...values } = row;
      await upsert("creatorTemplates", legacyId, { ...values, sortOrder: index });
      templateCount++;
    }
    let agentCount = 0;
    for (const [index, row] of (args.creatorAgents ?? []).entries()) {
      const { legacyId, ...values } = row;
      await upsert("creatorAgents", legacyId, { ...values, sortOrder: index });
      agentCount++;
    }
    return { quickPrompts: promptCount, creatorTemplates: templateCount, creatorAgents: agentCount };
  },
});
