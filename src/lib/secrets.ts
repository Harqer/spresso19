import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import dotenv from "dotenv";

// Load local development variables if available
dotenv.config();

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

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || "spresso-5561f";
  
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
    // Local development fallback if GCP Secret Manager retrieval fails
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      const localVal = process.env[secretName];
      if (localVal) {
        console.warn(`[Secrets] Failed to access secret "${secretName}" from GCP Secret Manager: ${error.message}. Falling back to process.env.`);
        cachedSecrets.set(secretName, localVal);
        return localVal;
      }
    }
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
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        console.error(`[Secrets] [FATAL] Fail-fast block triggered. ${err.message}`);
        process.exit(1);
      } else {
        console.warn(`[Secrets] [WARNING] Failed to load required secret: ${name}. Bypassing fatal exit for local development.`);
        // Set a dummy fallback so the server doesn't crash later when retrieving it
        cachedSecrets.set(name, "DUMMY_LOCAL_SECRET");
      }
    }
  }
}
