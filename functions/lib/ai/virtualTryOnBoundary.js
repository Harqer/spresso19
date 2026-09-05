"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualTryOnRequestSchema = void 0;
exports.parseVirtualTryOnRequest = parseVirtualTryOnRequest;
exports.providerAvailabilityError = providerAvailabilityError;
exports.isAlreadyExistsError = isAlreadyExistsError;
exports.safeVirtualTryOnError = safeVirtualTryOnError;
exports.parseVirtualTryOnResult = parseVirtualTryOnResult;
exports.createVirtualTryOnJobMetadata = createVirtualTryOnJobMetadata;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REMOTE_IMAGE_URL_LENGTH = 2048;
const optionalText = (max) => zod_1.z.preprocess(value => value === "" ? undefined : value, zod_1.z.string().trim().min(1).max(max).optional());
const imageInput = zod_1.z.preprocess(value => value === "" ? undefined : value, zod_1.z.string().optional())
    .superRefine((value, context) => {
    if (value === undefined)
        return;
    if (value.length > MAX_REMOTE_IMAGE_URL_LENGTH && !value.startsWith("data:")) {
        context.addIssue({ code: "custom", message: "Image reference is too large." });
        return;
    }
    const dataMatch = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (dataMatch) {
        const encoded = dataMatch[2];
        const bytes = Math.floor((encoded.length * 3) / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
        if (bytes < 1 || bytes > MAX_INLINE_IMAGE_BYTES) {
            context.addIssue({ code: "custom", message: "Image must be between 1 byte and 5 MB." });
        }
        return;
    }
    try {
        const url = new URL(value);
        if (url.protocol !== "https:")
            throw new Error("HTTPS required");
    }
    catch (_a) {
        context.addIssue({ code: "custom", message: "Image must be an HTTPS URL or supported inline image." });
    }
});
exports.VirtualTryOnRequestSchema = zod_1.z.object({
    productId: optionalText(256),
    productName: optionalText(256),
    productImage: imageInput,
    userPhotoBase64: imageInput,
    mediaType: zod_1.z.enum(["image", "video"]),
    height: optionalText(32),
    weight: optionalText(32),
    size: optionalText(32),
    fitPreference: zod_1.z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
    fabric: optionalText(80),
    locationContext: optionalText(120),
    customNotes: optionalText(500),
    idempotencyKey: zod_1.z.string().uuid().optional(),
}).strict().superRefine((value, context) => {
    if (!value.productId && !value.productName) {
        context.addIssue({ code: "custom", message: "A product is required." });
    }
});
function parseVirtualTryOnRequest(value) {
    return exports.VirtualTryOnRequestSchema.parse(value);
}
function providerAvailabilityError(credentials) {
    if (credentials.geminiApiKey || (credentials.higgsfieldKeyId && credentials.higgsfieldKeySecret))
        return null;
    return "Virtual try-on is temporarily unavailable.";
}
function isAlreadyExistsError(error) {
    const code = error === null || error === void 0 ? void 0 : error.code;
    return code === 6 || code === "6" || code === "already-exists" || code === "ALREADY_EXISTS";
}
function safeVirtualTryOnError(error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("timed out") || message.includes("timeout") || message.includes("aborted")) {
        return "Virtual try-on took too long. Please try again.";
    }
    if (message.includes("cancel"))
        return "Virtual try-on was cancelled. Please try again.";
    return "Virtual try-on is unavailable right now. Please try again.";
}
function parseVirtualTryOnResult(value) {
    const result = zod_1.z.object({
        mediaUrl: zod_1.z.union([
            zod_1.z.string().url().refine(url => url.startsWith("https://"), "Output URL must use HTTPS"),
            zod_1.z.string().regex(/^data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/]+=*$/i),
            zod_1.z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/i),
        ]),
        mediaType: zod_1.z.enum(["image", "video"]),
        provider: zod_1.z.enum(["gemini", "higgsfield"]),
    }).strict().parse(value);
    if (result.mediaUrl.startsWith("data:image/") && result.mediaType !== "image") {
        throw new Error("Generated media type does not match the output payload.");
    }
    if (result.mediaUrl.startsWith("data:video/") && result.mediaType !== "video") {
        throw new Error("Generated media type does not match the output payload.");
    }
    return result;
}
function createVirtualTryOnJobMetadata(input) {
    var _a;
    return Object.assign(Object.assign(Object.assign({ uid: input.uid, jobId: input.jobId, kind: "virtual_try_on", mediaType: input.mediaType, status: input.status, hasOutput: input.status === "completed" }, (input.status === "completed" && input.mediaUrl ? { outputHash: (0, node_crypto_1.createHash)("sha256").update(input.mediaUrl).digest("hex") } : {})), (input.provider ? { provider: input.provider } : {})), { createdAt: (_a = input.createdAt) !== null && _a !== void 0 ? _a : new Date().toISOString(), updatedAt: new Date().toISOString() });
}
//# sourceMappingURL=virtualTryOnBoundary.js.map