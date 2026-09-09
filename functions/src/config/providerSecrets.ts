import { defineSecret, SecretParam } from "firebase-functions/params";

/**
 * Provider credentials are injected into these server-only runtime names by
 * the deployment secret mechanism (Infisical KYZO in deployed environments).
 * The values are intentionally never read at module load time or logged.
 */
export const nvidiaApiKey = defineSecret("NVIDIA_API_KEY");
export const geminiApiKey = defineSecret("GEMINI_API_KEY");
export const higgsfieldKeyId = defineSecret("HIGGSFIELD_API_KEY_ID");
export const higgsfieldKeySecret = defineSecret("HIGGSFIELD_KEY_SECRET");

export const providerSecretBindings: SecretParam[] = [
  nvidiaApiKey,
  geminiApiKey,
  higgsfieldKeyId,
  higgsfieldKeySecret,
];

export type ProviderSecrets = {
  nvidiaApiKey: string;
  geminiApiKey?: string;
  higgsfieldKeyId?: string;
  higgsfieldKeySecret?: string;
};

export type SecretPresence = {
  nvidia: boolean;
  mediaFallback: boolean;
};

export class ProviderSecretConfigurationError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(`Provider configuration is incomplete: missing ${missing.join(", ")}.`);
    this.name = "ProviderSecretConfigurationError";
    this.missing = missing;
  }
}

function readSecret(secret: SecretParam): string | undefined {
  const value = secret.value().trim();
  return value.length > 0 ? value : undefined;
}

/**
 * Resolve provider credentials at request/runtime execution time.
 * NVIDIA inference is required; all other provider credentials are optional.
 */
export async function loadProviderSecrets(): Promise<ProviderSecrets> {
  const nvidia = readSecret(nvidiaApiKey);
  if (!nvidia) {
    throw new ProviderSecretConfigurationError(["NVIDIA_API_KEY"]);
  }

  return {
    nvidiaApiKey: nvidia,
    geminiApiKey: readSecret(geminiApiKey),
    higgsfieldKeyId: readSecret(higgsfieldKeyId),
    higgsfieldKeySecret: readSecret(higgsfieldKeySecret),
  };
}

/** Return configuration status without exposing credential material. */
export async function assertSecretPresence(): Promise<SecretPresence> {
  const nvidia = Boolean(readSecret(nvidiaApiKey));
  const mediaFallback = Boolean(readSecret(higgsfieldKeyId) && readSecret(higgsfieldKeySecret));
  return { nvidia, mediaFallback };
}
