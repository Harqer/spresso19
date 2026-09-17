import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit an active Spresso Glimmer wearable integration only when repository evidence identifies one; otherwise report the domain as not present.",
});
