import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptPayload } from "../src/receiptParsing";

test("rejects missing receipt image data", () => {
  assert.throws(() => parseReceiptPayload({}), /receipt image is required/i);
});

test("rejects oversized or unsupported receipt images", () => {
  assert.throws(() => parseReceiptPayload({ imageBase64: `data:image/gif;base64,${"A".repeat(32)}` }), /unsupported image type/i);
  assert.throws(() => parseReceiptPayload({ imageBase64: `data:image/jpeg;base64,${"A".repeat(7_000_000)}` }), /too large/i);
});

test("normalizes a valid receipt request without trusting client totals", () => {
  const payload = parseReceiptPayload({
    requestId: "receipt-123",
    imageBase64: "data:image/jpeg;base64,ZmFrZQ==",
  });
  assert.deepEqual(payload, {
    requestId: "receipt-123",
    mimeType: "image/jpeg",
    imageBase64: "ZmFrZQ==",
  });
});
