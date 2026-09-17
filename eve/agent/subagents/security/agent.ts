import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit Spresso Android, Convex, Firebase, provider, agentic, secret, auth, payment, and tool security boundaries.",
});
