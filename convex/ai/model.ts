/**
 * The Convex AI gateway accepts provider/model identifiers (for example
 * `openai/gpt-4o-mini` or another gateway-supported provider). Keeping the
 * identifier in deployment configuration lets Spresso change models without
 * changing the agent contract or importing a provider-specific SDK.
 */
import { env } from "../_generated/server";

// Documented Convex AI Gateway model. Override per deployment with
// SPRESSO_LLM_MODEL only after verifying it exists in the gateway catalog.
export const DEFAULT_LLM_MODEL = "openai/gpt-4o-mini";

export function configuredLlmModel(): string {
  const value = (env as Record<string, string | undefined>).SPRESSO_LLM_MODEL?.trim();
  return value || DEFAULT_LLM_MODEL;
}
