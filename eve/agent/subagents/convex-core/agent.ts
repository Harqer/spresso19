import { defineAgent } from "eve";

export default defineAgent({
  description: "Audit Spresso Convex schema, queries, mutations, actions, authz, indexes, rate limits, and canonical commerce state against current Convex guidance.",
  tool: false,
});
