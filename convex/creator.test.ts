import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-creator-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-creator-owner",
};

test("reference-data reads require an authenticated Firebase identity", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.creator.listQuickPrompts, {})).rejects.toThrow(/[Uu]nauthenticated/);
  await expect(t.query(api.creator.listCreatorTemplates, {})).rejects.toThrow(/[Uu]nauthenticated/);
  await expect(t.query(api.creator.listCreatorAgents, {})).rejects.toThrow(/[Uu]nauthenticated/);
});

test("legacy seed is idempotent and the list contracts return the curated rows", async () => {
  const t = convexTest(schema, modules);
  const rows = {
    quickPrompts: [
      { legacyId: "qp-1", prompt: "Find me a winter coat", title: "Winter Coat", subtitle: "Stay warm", icon: "ac_unit" },
      { legacyId: "qp-2", prompt: "Gifts under $50", title: "Gifts", subtitle: "Budget picks", icon: "card_giftcard" },
    ],
    creatorTemplates: [
      { legacyId: "ct-1", name: "Launch Teaser", creator: "Spresso", category: "Video", description: "Tease a launch", icon: "movie", promptExample: "Tease this product" },
    ],
    creatorAgents: [
      { legacyId: "ca-1", title: "Market Research", subtitle: "Research agent", icon: "insights", color: "#386633", bgColor: "#e8f3e8", borderColor: "#386633", capabilities: ["pricing"], quickPrompts: [{ label: "Compare prices", prompt: "Compare prices" }] },
    ],
  };

  const first = await t.mutation(internal.creator.seedFromLegacy, rows);
  expect(first).toEqual({ quickPrompts: 2, creatorTemplates: 1, creatorAgents: 1 });

  // Re-seeding the same legacy ids updates in place instead of duplicating.
  const second = await t.mutation(internal.creator.seedFromLegacy, {
    quickPrompts: [{ legacyId: "qp-1", prompt: "Find me a winter coat", title: "Winter Coat v2", subtitle: "Stay warm", icon: "ac_unit" }],
  });
  expect(second).toEqual({ quickPrompts: 1, creatorTemplates: 0, creatorAgents: 0 });

  const { prompts } = await t.withIdentity(owner).query(api.creator.listQuickPrompts, {});
  expect(prompts).toHaveLength(2);
  expect(prompts[0]).toMatchObject({ title: "Winter Coat v2", prompt: "Find me a winter coat" });

  const { templates } = await t.withIdentity(owner).query(api.creator.listCreatorTemplates, {});
  expect(templates[0]).toMatchObject({ name: "Launch Teaser", category: "Video" });

  const { agents } = await t.withIdentity(owner).query(api.creator.listCreatorAgents, {});
  expect(agents[0]).toMatchObject({ title: "Market Research", capabilities: ["pricing"] });
});

test("campaign generation rejects unauthenticated callers and blank inputs", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.aiGeneration.generateCreatorCampaign, { productName: "Shoe", campaignGoal: "Launch" }),
  ).rejects.toThrow(/[Uu]nauthenticated/);
  await expect(
    t.withIdentity(owner).action(api.aiGeneration.generateCreatorCampaign, { productName: "  ", campaignGoal: "Launch" }),
  ).rejects.toThrow(/required/);
});
