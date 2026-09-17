import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit Spresso Convex schema, queries, mutations, actions, authz, indexes, rate limits, and canonical commerce state against current Convex guidance.",
});
