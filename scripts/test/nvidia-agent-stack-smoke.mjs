/**
 * NVIDIA agent stack smoke suite.
 *
 * Non-destructive by construction: no network egress, no cloud credentials,
 * no Firebase/Convex initialization. Boundary dependencies are injected, so
 * this suite proves control flow and fail-closed behavior without touching
 * production systems.
 *
 * Run: npx tsx --test scripts/test/nvidia-agent-stack-smoke.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import { AgentOrchestrator, OrchestrationError } from "../../functions/src/ai/orchestration/agentOrchestrator.ts";
import { shouldUseNemotron } from "../../functions/src/ai/modelRouting.ts";
import { MediaGateway } from "../../functions/src/ai/providers/mediaGateway.ts";
import { createDiscoveryTools } from "../../services/openclaw/tools/discovery.ts";
import { createBrowserTools } from "../../services/openclaw/tools/browser.ts";

const allow = async () => ({ allowed: true });

function memoryMediaStore() {
  const jobs = new Map();
  return {
    async getByIdempotency(uid, key) { return jobs.get(`${uid}:${key}`); },
    async create(job) { jobs.set(`${job.requesterUid}:${job.idempotencyKey}`, job); },
    async update(jobId, patch) {
      const job = [...jobs.values()].find((candidate) => candidate.jobId === jobId);
      if (job) Object.assign(job, patch);
    },
    async getByJobId(jobId) { return [...jobs.values()].find((candidate) => candidate.jobId === jobId); },
  };
}

test("smoke: safe answer intent completes without confirmation", async () => {
  const orchestrator = new AgentOrchestrator({
    classify: async () => ({ intent: "answer", confidence: 0.98, rationale: "Styling question.", requiresConfirmation: false }),
    validateInput: allow,
    validateToolCall: allow,
    consumeBudget: async () => undefined,
    issueConfirmation: async () => { throw new Error("must not confirm for answers"); },
    consumeConfirmation: async () => false,
    executeTool: async () => { throw new Error("must not execute"); },
  });
  const result = await orchestrator.handle({ uid: "u-1", prompt: "What shoes suit a linen suit?", correlationId: "smoke-1" });
  assert.equal(result.plan.intent, "answer");
  assert.equal(result.pendingConfirmation, undefined);
});

test("smoke: multimodal and strong-reasoning requests are Nemotron-eligible", () => {
  assert.equal(shouldUseNemotron({ prompt: "What is this?", imageUrls: ["https://images.example/item.jpg"] }), true);
  assert.equal(shouldUseNemotron({ prompt: "Compare the fabric and fit", imageUrls: [] }), true);
  assert.equal(shouldUseNemotron({ prompt: "Find a blue shirt", imageUrls: [] }), false);
});

test("smoke: try-on media job completes through an injected provider contract", async () => {
  const gateway = new MediaGateway({
    store: memoryMediaStore(),
    providers: [{
      provider: "smoke-media",
      async generate() {
        return { mediaUrl: "https://cdn.example/tryon.png", mediaType: "image", safety: "approved" };
      },
    }],
    retryDelayMs: 0,
  });
  const submitted = await gateway.submitMediaJob({
    prompt: "Show the wool coat on the reference photo",
    mediaType: "image",
    imageUrls: ["https://merchant.example/coat.jpg"],
    requesterUid: "smoke-user",
    idempotencyKey: "smoke-tryon-1",
  });
  assert.equal(submitted.status, "queued");
  await gateway.waitForIdle(submitted.jobId);
  const polled = await gateway.pollMediaJob(submitted.jobId);
  assert.equal(polled.status, "completed");
});

test("smoke: payment submission is denied at the orchestration boundary", async () => {
  const orchestrator = new AgentOrchestrator({
    classify: async () => ({ intent: "prepare_tool_action", confidence: 0.99, rationale: "attempted purchase", proposedTool: "submit_payment", proposedArguments: {}, requiresConfirmation: false }),
    validateInput: allow,
    validateToolCall: allow,
    consumeBudget: async () => undefined,
    issueConfirmation: async () => { throw new Error("must not confirm"); },
    consumeConfirmation: async () => false,
    executeTool: async () => { throw new Error("must not execute"); },
  });
  await assert.rejects(orchestrator.handle({ uid: "u-1", prompt: "buy it now", correlationId: "smoke-2" }), OrchestrationError);
});

test("smoke: approved page read is sanitized and bounded", async () => {
  process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS = "shop.example";
  const tools = createBrowserTools({
    resolveHost: async () => [{ address: "93.184.216.34", family: 4 }],
    validateToolCall: allow,
    validateToolResult: allow,
    fetchImpl: async () => new Response("<html><head><title>Coat</title></head><body><script>alert(1)</script><p>Wool coat details</p></body></html>", { status: 200, headers: { "content-type": "text/html" } }),
  });
  const snapshot = await tools.readProductPage({ url: "https://shop.example/coat" }, { uid: "smoke-user", correlationId: "smoke-3" });
  assert.ok(snapshot.text.includes("Wool coat details"));
  assert.equal(snapshot.text.includes("alert(1)"), false);
  delete process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS;
});

test("smoke: checkout preparation requires a real executor and trusted confirmation", async () => {
  const tools = createDiscoveryTools({
    catalog: { configured: false, async searchProducts() { throw new Error("unused"); } },
    validateToolCall: allow,
    validateToolResult: allow,
    consumeConfirmation: async () => true,
    now: () => 1_000,
  });
  await assert.rejects(tools.prepareCart({ listingId: "l-1" }, { uid: "smoke-user", correlationId: "smoke-4", confirmationToken: "t-1" }));
});
