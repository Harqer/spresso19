import assert from "node:assert/strict";
import test from "node:test";
import {
  createVirtualTryOnJobMetadata,
  isAlreadyExistsError,
  parseVirtualTryOnRequest,
  parseVirtualTryOnResult,
  providerAvailabilityError,
  safeVirtualTryOnError,
} from "../src/ai/virtualTryOnBoundary";
import { generateVirtualTryOn } from "../src/ai";

const validRequest = {
  productId: "listing-123",
  productName: "Wool coat",
  productImage: "https://merchant.example/images/coat.jpg",
  userPhotoBase64: "data:image/jpeg;base64," + Buffer.from("image-bytes").toString("base64"),
  mediaType: "image" as const,
  idempotencyKey: "12b9fc19-0f9a-472a-bb1c-a2e7d8954255",
};

test("requires authenticated App Check context before provider work", async () => {
  await assert.rejects(
    generateVirtualTryOn.run({ data: validRequest } as any),
    (error: any) => error?.code === "unauthenticated",
  );

  await assert.rejects(
    generateVirtualTryOn.run({ auth: { uid: "user-123" }, data: validRequest } as any),
    (error: any) => error?.code === "failed-precondition",
  );
});

test("rejects empty, oversized, and unsupported media inputs", () => {
  assert.throws(() => parseVirtualTryOnRequest({ ...validRequest, userPhotoBase64: "data:image/jpeg;base64," }));
  assert.throws(() => parseVirtualTryOnRequest({
    ...validRequest,
    userPhotoBase64: `data:image/jpeg;base64,${"A".repeat(7_000_001)}`,
  }));
  assert.throws(() => parseVirtualTryOnRequest({ ...validRequest, mediaType: "audio" }));
});

test("rejects unsupported provider configuration without exposing secrets", () => {
  assert.equal(providerAvailabilityError({}), "Virtual try-on is temporarily unavailable.");
  assert.equal(providerAvailabilityError({ geminiApiKey: "gemini" }), null);
  assert.equal(providerAvailabilityError({ higgsfieldKeyId: "id", higgsfieldKeySecret: "secret" }), null);
});

test("maps provider timeout and rejection to customer-safe errors", () => {
  assert.equal(safeVirtualTryOnError(new Error("Gemini video generation timed out")), "Virtual try-on took too long. Please try again.");
  assert.equal(safeVirtualTryOnError(new Error("Higgsfield generation canceled")), "Virtual try-on was cancelled. Please try again.");
  assert.equal(safeVirtualTryOnError(new Error("provider rejected the request")), "Virtual try-on is unavailable right now. Please try again.");
});

test("rejects provider results with an invalid or mismatched media payload", () => {
  assert.throws(() => parseVirtualTryOnResult({
    mediaUrl: "javascript:alert(1)",
    mediaType: "image",
    provider: "gemini",
  }));
  assert.throws(() => parseVirtualTryOnResult({
    mediaUrl: "data:image/png;base64,aW1hZ2U=",
    mediaType: "video",
    provider: "gemini",
  }));
});

test("job metadata contains no image bytes or signed URL", () => {
  const metadata = createVirtualTryOnJobMetadata({
    uid: "user-123",
    jobId: validRequest.idempotencyKey,
    mediaType: "image",
    provider: "gemini",
    mediaUrl: "data:image/png;base64,secret-image-bytes",
    status: "completed",
  });

  assert.equal(metadata.uid, "user-123");
  assert.equal(metadata.hasOutput, true);
  assert.equal("mediaUrl" in metadata, false);
  assert.equal(JSON.stringify(metadata).includes("secret-image-bytes"), false);
  assert.equal(JSON.stringify(metadata).includes("https://"), false);
});

test("recognizes replay conflicts without masking transient Firestore failures", () => {
  assert.equal(isAlreadyExistsError({ code: 6 }), true);
  assert.equal(isAlreadyExistsError({ code: "already-exists" }), true);
  assert.equal(isAlreadyExistsError({ code: 14 }), false);
});
