import assert from "node:assert/strict";
import test from "node:test";
import { decodeGeneratedMedia } from "../src/ai/virtualTryOnStorage";

test("decodes supported generated data URLs without logging or persisting source text", () => {
  const decoded = decodeGeneratedMedia("data:image/png;base64,aW1hZ2U=");
  assert.equal(decoded.mimeType, "image/png");
  assert.deepEqual([...decoded.bytes], [105, 109, 97, 103, 101]);
});

test("rejects untrusted generated media URLs", () => {
  assert.throws(() => decodeGeneratedMedia("javascript:alert(1)"), /unsupported media/i);
});
