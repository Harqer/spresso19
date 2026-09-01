import Logger from "./Logger";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const cachedSecrets = new Map<string, string>();
let client: SecretManagerServiceClient | null = null;

function getSecretClient(): SecretManagerServiceClient {
  if (!client) {
    client = new SecretManagerServiceClient();
  }
  return client;
}

/**
 * Accesses a secret from Google Cloud Secret Manager.
 * Caches the value in memory on the first fetch.
 */
export async function getSecret(secretName: string): Promise<string> {
  if (cachedSecrets.has(secretName)) {
    return cachedSecrets.get(secretName)!;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || "get-spresso";
  
  // Dynamic version override support (e.g. GEMINI_API_KEY_VERSION)
  const envVersionKey = `${secretName}_VERSION`;
  const versionId = process.env[envVersionKey] || "latest";

  try {
    const secretClient = getSecretClient();
    const name = `projects/${projectId}/secrets/${secretName}/versions/${versionId}`;
    
    const [version] = await secretClient.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString() || "";
    
    if (!payload) {
      throw new Error(`Secret payload is empty`);
    }

    cachedSecrets.set(secretName, payload);
    return payload;
  } catch (error: any) {
    // Never print secret values in logs; log only the secret name and exact error message
    throw new Error(`Failed to access secret "${secretName}" (version: ${versionId}) from GCP Secret Manager: ${error.message}`);
  }
}

export async function initializeSecrets(requiredSecrets: string[]): Promise<void> {
  console.log("[Secrets] Pre-warming required secrets from Cloud Secret Manager...");
  for (const name of requiredSecrets) {
    try {
      await getSecret(name);
      console.log(`[Secrets] Successfully loaded and cached secret: ${name}`);
    } catch (err: any) {
      Logger.error(`[Secrets] [FATAL] Fail-fast block triggered. ${err.message}`);
      process.exit(1);
    }
  }
}
