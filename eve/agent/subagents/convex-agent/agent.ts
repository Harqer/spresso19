import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit Spresso Convex Agent, tools, context, streaming, hosted execution, workflows, and human approval boundaries.",
});
