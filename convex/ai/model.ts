/**
 * The Convex AI gateway accepts provider/model identifiers (for example
 * `openai/gpt-5.6-luna` or another gateway-supported provider). Keeping the
 * identifier in deployment configuration lets Spresso change models without
 * changing the agent contract or importing a provider-specific SDK.
 */
import { env } from "../_generated/server";

export const DEFAULT_LLM_MODEL = "openai/gpt-5.6-luna";

export function configuredLlmModel(): string {
  const value = (env as Record<string, string | undefined>).SPRESSO_LLM_MODEL?.trim();
  return value || DEFAULT_LLM_MODEL;
}
