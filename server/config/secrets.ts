import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getRuntimeSecret(secretName: string): Promise<string | null> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'spresso-5561f';
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    return payload || null;
  } catch (error) {
    console.warn(`[Secret Manager] Failed to fetch secret ${secretName}:`, error);
    return null;
  }
}

export async function fetchSecrets() {
  const STRIPE_SECRET_KEY = await getRuntimeSecret('STRIPE_SECRET_KEY');
  const META_CLIENT_TOKEN = await getRuntimeSecret('META_CLIENT_TOKEN');
  
  if (STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = STRIPE_SECRET_KEY;
  if (META_CLIENT_TOKEN) process.env.META_CLIENT_TOKEN = META_CLIENT_TOKEN;
}
