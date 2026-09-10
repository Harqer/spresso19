/**
 * Provider credentials are injected into these server-only runtime names by
 * the deployment secret mechanism (Infisical KYZO in deployed environments).
 * The values are intentionally never read at module load time or logged.
 * Deployment entrypoints bind only the credentials they consume; this shared
 * resolver does not declare Firebase Secret Manager bindings of its own.
 */
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
export function assertInfisicalRuntimeConfiguration(): InfisicalRuntimeConfiguration {
  const project = process.env[infisicalProjectEnv]?.trim();
  const environment = process.env[infisicalEnvironmentEnv]?.trim();
  const secretPath = process.env[infisicalSecretPathEnv]?.trim();
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

function readSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/**
 * Resolve provider credentials at request/runtime execution time.
 * NVIDIA inference is required; all other provider credentials are optional.
 */
export async function loadProviderSecrets(): Promise<ProviderSecrets> {
  assertInfisicalRuntimeConfiguration();
  const nvidia = readSecret("NVIDIA_API_KEY");
  if (!nvidia) {
    throw new ProviderSecretConfigurationError(["NVIDIA_API_KEY"]);
  }

  return {
    nvidiaApiKey: nvidia,
    geminiApiKey: readSecret("GEMINI_API_KEY"),
    higgsfieldKeyId: readSecret("HIGGSFIELD_API_KEY_ID"),
    higgsfieldKeySecret: readSecret("HIGGSFIELD_KEY_SECRET"),
  };
}

/** Return configuration status without exposing credential material. */
export async function assertSecretPresence(): Promise<SecretPresence> {
  assertInfisicalRuntimeConfiguration();
  const nvidia = Boolean(readSecret("NVIDIA_API_KEY"));
  const mediaFallback = Boolean(readSecret("HIGGSFIELD_API_KEY_ID") && readSecret("HIGGSFIELD_KEY_SECRET"));
  return { nvidia, mediaFallback };
}
