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

const INFISICAL_PROJECT = "KYZO" as const;
const infisicalProjectEnv = "INFISICAL_PROJECT_ID";
const infisicalEnvironmentEnv = "INFISICAL_ENVIRONMENT";
const infisicalSecretPathEnv = "INFISICAL_SECRET_PATH";

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

export type InfisicalRuntimeConfiguration = {
  project: typeof INFISICAL_PROJECT;
  environment: string;
  secretPath: string;
};

/**
 * Verify the non-secret provenance supplied by the Infisical runtime injector.
 * Secret payloads remain external to the process configuration and are never
 * included in this result or in configuration errors.
 */
export function assertInfisicalRuntimeConfiguration(): InfisicalRuntimeConfiguration | undefined {
  const project = process.env[infisicalProjectEnv]?.trim();
  const environment = process.env[infisicalEnvironmentEnv]?.trim();
  const secretPath = process.env[infisicalSecretPathEnv]?.trim();
  if (!project && !environment && !secretPath) return undefined;
  const missing = [
    !project || project !== INFISICAL_PROJECT ? infisicalProjectEnv : "",
    !environment ? infisicalEnvironmentEnv : "",
    !secretPath ? infisicalSecretPathEnv : "",
  ].filter((name): name is string => name.length > 0);
  if (missing.length > 0) {
    throw new ProviderSecretConfigurationError(missing);
  }
  return { project: INFISICAL_PROJECT, environment: environment as string, secretPath: secretPath as string };
}

function readSecret(secret: SecretParam): string | undefined {
  // SecretParam.value() warns when its dependency is not bound. Checking the
  // runtime injection marker first keeps optional credentials quiet while
  // retaining the deployment-managed SecretParam accessor.
  if (process.env[secret.name] === undefined) return undefined;
  const value = secret.value().trim();
  return value.length > 0 ? value : undefined;
}

/**
 * Resolve provider credentials at request/runtime execution time.
 * NVIDIA inference is required; all other provider credentials are optional.
 */
export async function loadProviderSecrets(): Promise<ProviderSecrets> {
  assertInfisicalRuntimeConfiguration();
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
  assertInfisicalRuntimeConfiguration();
  const nvidia = Boolean(readSecret(nvidiaApiKey));
  const mediaFallback = Boolean(readSecret(higgsfieldKeyId) && readSecret(higgsfieldKeySecret));
  return { nvidia, mediaFallback };
}
