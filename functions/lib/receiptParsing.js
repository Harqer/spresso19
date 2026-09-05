"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsedReceiptSchema = void 0;
exports.parseReceiptPayload = parseReceiptPayload;
const zod_1 = require("zod");
const node_crypto_1 = require("node:crypto");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const RECEIPT_IMAGE_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
function parseReceiptPayload(data) {
    if (!data || typeof data !== "object")
        throw new Error("Receipt image is required.");
    const input = data;
    const imageBase64 = typeof input.imageBase64 === "string" ? input.imageBase64 : "";
    if (!imageBase64)
        throw new Error("Receipt image is required.");
    const match = RECEIPT_IMAGE_PATTERN.exec(imageBase64);
    if (!match)
        throw new Error("Unsupported image type or encoding.");
    const encoded = match[2];
    const estimatedBytes = Math.floor((encoded.length * 3) / 4);
    if (estimatedBytes > MAX_IMAGE_BYTES)
        throw new Error("Receipt image is too large.");
    const requestId = typeof input.requestId === "string" && input.requestId.trim()
        ? input.requestId.trim().slice(0, 120)
        : (0, node_crypto_1.randomUUID)();
    return { requestId, mimeType: match[1], imageBase64: encoded };
}
exports.ParsedReceiptSchema = zod_1.z.object({
    merchantName: zod_1.z.string().max(200).nullable(),
    purchaseDate: zod_1.z.string().max(40).nullable(),
    currency: zod_1.z.string().regex(/^[A-Z]{3}$/).nullable(),
    total: zod_1.z.number().nonnegative().nullable(),
    items: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        quantity: zod_1.z.number().int().positive().max(100).default(1),
        amount: zod_1.z.number().nonnegative().nullable(),
    }).strict()).max(100),
}).strict();
//# sourceMappingURL=receiptParsing.js.map