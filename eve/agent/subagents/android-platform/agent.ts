import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit Spresso Android platform integration, Navigation 3, AppFunctions, AGP, lifecycle, state restoration, and platform boundaries.",
});
