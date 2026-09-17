import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit and remediate Spresso Compose Multiplatform UI, Material 3, adaptive layout, accessibility, state, and recomposition within the assigned UI scope.",
});
