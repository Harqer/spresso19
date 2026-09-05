import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";

const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;

export type DecodedGeneratedMedia = {
  bytes: Buffer;
  mimeType: string;
};

export function decodeGeneratedMedia(mediaUrl: string): DecodedGeneratedMedia {
  const match = /^data:(image\/(?:png|jpeg|webp)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/]+=*)$/i.exec(mediaUrl);
  if (!match) throw new Error("Unsupported media output.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_OUTPUT_BYTES) throw new Error("Generated media output is invalid.");
  return { bytes, mimeType: match[1].toLowerCase() };
}

export async function persistGeneratedMedia(uid: string, jobId: string, mediaUrl: string): Promise<string> {
  let decoded: DecodedGeneratedMedia;
  if (mediaUrl.startsWith("data:")) {
    decoded = decodeGeneratedMedia(mediaUrl);
  } else {
    const url = new URL(mediaUrl);
    if (url.protocol !== "https:") throw new Error("Unsupported media output.");
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Generated media download failed.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_OUTPUT_BYTES) throw new Error("Generated media output is invalid.");
    decoded = { bytes, mimeType: response.headers.get("content-type")?.split(";")[0] || "application/octet-stream" };
  }
  if (!/^image\/(?:png|jpeg|webp)$|^video\/(?:mp4|webm)$/.test(decoded.mimeType)) throw new Error("Unsupported media output.");
  const extension = decoded.mimeType.split("/")[1];
  const file = getStorage().bucket().file(`users/${uid}/virtual-try-on/${jobId}-${randomUUID()}.${extension}`);
  await file.save(decoded.bytes, { resumable: false, metadata: { contentType: decoded.mimeType, metadata: { ownerUid: uid, jobId } } });
  const [signedUrl] = await file.getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });
  return signedUrl;
}
