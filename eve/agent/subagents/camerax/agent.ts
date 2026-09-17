import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL ?? "openai/gpt-5.6-luna",
  description: "Audit and remediate Spresso CameraX capture, analysis, permissions, lifecycle, threading, orientation, cleanup, and recovery without touching Meta wearable capture.",
});
