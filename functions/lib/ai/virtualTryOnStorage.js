"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeGeneratedMedia = decodeGeneratedMedia;
exports.persistGeneratedMedia = persistGeneratedMedia;
const storage_1 = require("firebase-admin/storage");
const node_crypto_1 = require("node:crypto");
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;
function decodeGeneratedMedia(mediaUrl) {
    const match = /^data:(image\/(?:png|jpeg|webp)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/]+=*)$/i.exec(mediaUrl);
    if (!match)
        throw new Error("Unsupported media output.");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length === 0 || bytes.length > MAX_OUTPUT_BYTES)
        throw new Error("Generated media output is invalid.");
    return { bytes, mimeType: match[1].toLowerCase() };
}
async function persistGeneratedMedia(uid, jobId, mediaUrl) {
    var _a;
    let decoded;
    if (mediaUrl.startsWith("data:")) {
        decoded = decodeGeneratedMedia(mediaUrl);
    }
    else {
        const url = new URL(mediaUrl);
        if (url.protocol !== "https:")
            throw new Error("Unsupported media output.");
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok)
            throw new Error("Generated media download failed.");
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length === 0 || bytes.length > MAX_OUTPUT_BYTES)
            throw new Error("Generated media output is invalid.");
        decoded = { bytes, mimeType: ((_a = response.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.split(";")[0]) || "application/octet-stream" };
    }
    if (!/^image\/(?:png|jpeg|webp)$|^video\/(?:mp4|webm)$/.test(decoded.mimeType))
        throw new Error("Unsupported media output.");
    const extension = decoded.mimeType.split("/")[1];
    const file = (0, storage_1.getStorage)().bucket().file(`users/${uid}/virtual-try-on/${jobId}-${(0, node_crypto_1.randomUUID)()}.${extension}`);
    await file.save(decoded.bytes, { resumable: false, metadata: { contentType: decoded.mimeType, metadata: { ownerUid: uid, jobId } } });
    const [signedUrl] = await file.getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });
    return signedUrl;
}
//# sourceMappingURL=virtualTryOnStorage.js.map