import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit Spresso Meta Wearables DAT registration, permissions, sessions, camera streams, Display DSL, lifecycle, and failure handling.",
});
