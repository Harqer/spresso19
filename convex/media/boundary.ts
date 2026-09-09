export const MAX_GENERATED_MEDIA_BYTES = 25 * 1024 * 1024;
export const PRIVATE_MEDIA_URL_TTL_SECONDS = 15 * 60;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export type StoredMedia = {
  mediaKey: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
};

export function validateGeneratedMedia(bytes: Uint8Array, mimeType: string): string {
  if (bytes.byteLength === 0) throw new Error("Generated media is empty.");
  if (bytes.byteLength > MAX_GENERATED_MEDIA_BYTES) throw new Error("Generated media exceeds the 25 MiB limit.");
  const normalizedMime = mimeType.trim().toLowerCase();
  if (!MIME_EXTENSIONS[normalizedMime]) throw new Error("Generated media type is not allowed.");
  return normalizedMime;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function createMediaKey(ownerUid: string, bytes: Uint8Array, mimeType: string): Promise<StoredMedia> {
  const uid = ownerUid.trim();
  if (!uid || uid.includes("/") || uid.includes("\\") || uid === "." || uid === "..") {
    throw new Error("A valid media owner is required.");
  }
  const normalizedMime = validateGeneratedMedia(bytes, mimeType);
  const sha256 = await sha256Hex(bytes);
  return {
    mediaKey: `private/users/${uid}/generated/${sha256}.${MIME_EXTENSIONS[normalizedMime]}`,
    mimeType: normalizedMime,
    byteLength: bytes.byteLength,
    sha256,
  };
}

export function assertPrivateMediaKey(ownerUid: string, mediaKey: string): void {
  const expectedPrefix = `private/users/${ownerUid}/generated/`;
  if (!mediaKey.startsWith(expectedPrefix) || mediaKey.includes("..") || mediaKey.includes("\\")) {
    throw new Error("Media does not belong to this user.");
  }
}
