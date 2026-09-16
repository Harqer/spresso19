import assert from "node:assert/strict";
import test from "node:test";
import {
  MediaGateway,
  MediaGatewayError,
  type MediaJobStore,
  type MediaProviderAdapter,
} from "../src/ai/providers/mediaGateway";

type Job = Awaited<ReturnType<MediaJobStore["getByIdempotency"]>>;

function memoryStore(): MediaJobStore {
  const jobs = new Map<string, Exclude<Job, undefined>>();
  return {
    async getByIdempotency(requesterUid, idempotencyKey) {
      return jobs.get(`${requesterUid}:${idempotencyKey}`);
    },
    async create(job) {
      const key = `${job.requesterUid}:${job.idempotencyKey}`;
      if (jobs.has(key)) throw new Error("already exists");
      jobs.set(key, job);
    },
    async update(jobId, patch) {
      const job = [...jobs.values()].find((candidate) => candidate.jobId === jobId);
      if (!job) throw new Error("missing job");
      Object.assign(job, patch);
    },
    async getByJobId(jobId) {
      return [...jobs.values()].find((candidate) => candidate.jobId === jobId);
    },
  };
}

function request() {
  return {
    prompt: "Show this jacket on me",
    mediaType: "image" as const,
    imageUrls: ["https://merchant.example/jacket.jpg"],
    requesterUid: "user-123",
    idempotencyKey: "request-123",
  };
}

function provider(overrides: Partial<MediaProviderAdapter> = {}): MediaProviderAdapter {
  return {
    provider: "gemini",
    async generate() {
      return {
        mediaUrl: "https://cdn.example/result.png",
        mediaType: "image",
        safety: "approved",
      };
    },
    ...overrides,
  };
}

async function settle(gateway: MediaGateway, jobId: string) {
  await gateway.waitForIdle(jobId);
  return gateway.pollMediaJob(jobId);
}

test("submits a queued job and returns the same job for duplicate idempotency keys", async () => {
  const gateway = new MediaGateway({ store: memoryStore(), providers: [provider()] });
  const first = await gateway.submitMediaJob(request());
  const duplicate = await gateway.submitMediaJob(request());

  assert.equal(first.status, "queued");
  assert.equal(duplicate.jobId, first.jobId);
  assert.equal(duplicate.status, "queued");
  assert.equal((await settle(gateway, first.jobId)).status, "completed");
});

test("selects a provider by media type and rejects unsupported selection", async () => {
  let calls = 0;
  const gateway = new MediaGateway({
    store: memoryStore(),
    providers: [provider({
      provider: "gemini",
      async generate(input) {
        calls += 1;
        assert.equal(input.mediaType, "video");
        return { mediaUrl: "https://cdn.example/result.mp4", mediaType: "video", safety: "approved" };
      },
    })],
  });
  const result = await gateway.submitMediaJob({ ...request(), mediaType: "video", idempotencyKey: "video-123" });
  assert.equal((await settle(gateway, result.jobId)).status, "completed");
  assert.equal(calls, 1);

  const noProvider = new MediaGateway({ store: memoryStore(), providers: [] });
  await assert.rejects(noProvider.submitMediaJob({ ...request(), idempotencyKey: "unsupported-1" }), MediaGatewayError);
});

test("rejects unsafe and malformed provider results without completing the job", async () => {
  for (const result of [
    { mediaUrl: "https://cdn.example/result.png", mediaType: "image", safety: "rejected" },
    { mediaUrl: "javascript:alert(1)", mediaType: "image", safety: "approved" },
    { mediaUrl: "https://cdn.example/result.png", mediaType: "video", safety: "approved" },
  ] as const) {
    const gateway = new MediaGateway({ store: memoryStore(), providers: [provider({ async generate() { return result; } })] });
    const submitted = await gateway.submitMediaJob({ ...request(), idempotencyKey: `invalid-${result.mediaType}-${result.safety}` });
    const completed = await settle(gateway, submitted.jobId);
    assert.equal(completed.status, "failed");
    assert.equal(completed.mediaUrl, undefined);
  }
});

test("activates the ordered real fallback after technical primary failure", async () => {
  const selected: string[] = [];
  const gateway = new MediaGateway({
    store: memoryStore(),
    providers: [
      provider({ provider: "primary", async generate() { selected.push("primary"); throw new Error("outage"); } }),
      provider({ provider: "fallback", async generate() { selected.push("fallback"); return { mediaUrl: "https://cdn.example/fallback.png", mediaType: "image", safety: "approved" }; } }),
    ],
    retryDelayMs: 0,
  });
  const submitted = await gateway.submitMediaJob(request());
  const completed = await settle(gateway, submitted.jobId);
  assert.equal(completed.status, "completed");
  assert.equal(completed.provider, "fallback");
  assert.deepEqual(selected, ["primary", "primary", "primary", "fallback"]);
});

test("records terminal provider exhaustion without fabricating output", async () => {
  const gateway = new MediaGateway({
    store: memoryStore(),
    providers: [
      provider({ provider: "primary", async generate() { throw new Error("outage"); } }),
      provider({ provider: "fallback", async generate() { throw new Error("timeout"); } }),
    ],
    retryDelayMs: 0,
  });
  const submitted = await gateway.submitMediaJob(request());
  const completed = await settle(gateway, submitted.jobId);
  assert.equal(completed.status, "failed");
  assert.equal(completed.mediaUrl, undefined);
});

test("does not bypass a provider safety denial with another provider", async () => {
  let fallbackCalls = 0;
  const gateway = new MediaGateway({
    store: memoryStore(),
    providers: [
      provider({ provider: "primary", async generate() { return { mediaUrl: "https://cdn.example/blocked.png", mediaType: "image", safety: "rejected" }; } }),
      provider({ provider: "fallback", async generate() { fallbackCalls += 1; return { mediaUrl: "https://cdn.example/fallback.png", mediaType: "image", safety: "approved" }; } }),
    ],
    retryDelayMs: 0,
  });
  const submitted = await gateway.submitMediaJob(request());
  const completed = await settle(gateway, submitted.jobId);
  assert.equal(completed.status, "failed");
  assert.equal(fallbackCalls, 0);
});

test("retries transient provider failures at most three times and then fails", async () => {
  let attempts = 0;
  const gateway = new MediaGateway({
    store: memoryStore(),
    providers: [provider({
      async generate() {
        attempts += 1;
        throw new Error("transient provider failure");
      },
    })],
    retryDelayMs: 0,
  });
  const submitted = await gateway.submitMediaJob(request());
  const completed = await settle(gateway, submitted.jobId);
  assert.equal(completed.status, "failed");
  assert.equal(attempts, 3);
});

test("polling an unknown job fails without revealing provider details", async () => {
  const gateway = new MediaGateway({ store: memoryStore(), providers: [provider()] });
  await assert.rejects(gateway.pollMediaJob("missing-job"), (error: unknown) => {
    assert.ok(error instanceof MediaGatewayError);
    assert.equal(error.message.includes("provider"), false);
    return true;
  });
});
