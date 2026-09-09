import { assertPrivateMediaKey, PRIVATE_MEDIA_URL_TTL_SECONDS, StoredMedia } from "./boundary";

export type BunnyConfig = {
  storageHost: string;
  storageZone: string;
  storageAccessKey: string;
  cdnBaseUrl: string;
  cdnTokenKey: string;
};

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Missing ${name} configuration.`);
  return normalized;
}

export function bunnyConfigFromEnv(env: Record<string, string | undefined>): BunnyConfig {
  const cdnBaseUrl = required(env.BUNNY_CDN_BASE_URL, "BUNNY_CDN_BASE_URL");
  const parsed = new URL(cdnBaseUrl);
  if (parsed.protocol !== "https:") throw new Error("BUNNY_CDN_BASE_URL must use HTTPS.");
  const storageHost = required(env.BUNNY_STORAGE_HOST, "BUNNY_STORAGE_HOST");
  const storageParsed = new URL(storageHost);
  if (storageParsed.protocol !== "https:") throw new Error("BUNNY_STORAGE_HOST must use HTTPS.");
  return {
    storageHost: storageHost.replace(/\/$/, ""),
    storageZone: required(env.BUNNY_STORAGE_ZONE, "BUNNY_STORAGE_ZONE"),
    storageAccessKey: required(env.BUNNY_STORAGE_ACCESS_KEY, "BUNNY_STORAGE_ACCESS_KEY"),
    cdnBaseUrl: cdnBaseUrl.replace(/\/$/, ""),
    cdnTokenKey: required(env.BUNNY_CDN_TOKEN_KEY, "BUNNY_CDN_TOKEN_KEY"),
  };
}

export class BunnyMediaStore {
  constructor(private readonly config: BunnyConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async putGenerated(media: StoredMedia, bytes: Uint8Array): Promise<StoredMedia> {
    const path = media.mediaKey.split("/").map(encodeURIComponent).join("/");
    const url = `${this.config.storageHost}/${encodeURIComponent(this.config.storageZone)}/${path}`;
    const response = await this.fetchImpl(url, {
      method: "PUT",
      headers: {
        AccessKey: this.config.storageAccessKey,
        "Content-Type": media.mimeType,
        "Content-Length": String(bytes.byteLength),
        "X-Checksum": media.sha256,
      },
      body: bytes as BodyInit,
    });
    if (!response.ok) throw new Error(`Bunny media upload failed (${response.status}).`);
    return media;
  }

  async createReadUrl(ownerUid: string, mediaKey: string, expiresInSeconds = PRIVATE_MEDIA_URL_TTL_SECONDS): Promise<string> {
    assertPrivateMediaKey(ownerUid, mediaKey);
    const ttl = Math.max(1, Math.min(expiresInSeconds, PRIVATE_MEDIA_URL_TTL_SECONDS));
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const path = `/${mediaKey}`;
    // Bunny Advanced Token Authentication: HS256 + Base64URL(HMAC-SHA256(
    // security_key, signature_path + expires + signing_data)). With no
    // optional restrictions, signing_data is empty and the IP flag is empty.
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.config.cdnTokenKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${path}${expires}`));
    const binary = String.fromCharCode(...new Uint8Array(signature));
    const token = `HS256-${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
    const url = new URL(`${this.config.cdnBaseUrl}${path}`);
    url.searchParams.set("token", token);
    url.searchParams.set("expires", String(expires));
    return url.toString();
  }
}
