import assert from "node:assert/strict";
import test from "node:test";
import { classifyIntent, NemotronConfigurationError, NemotronProtocolError } from "../src/ai/providers/nemotronGateway";
import { shouldUseNemotron } from "../src/ai/modelRouting";

const envNames = ["NVIDIA_API_KEY", "INFISICAL_PROJECT_ID", "INFISICAL_ENVIRONMENT", "INFISICAL_SECRET_PATH", "NVIDIA_NIM_BASE_URL", "NVIDIA_NIM_MODEL"] as const;
const originalEnvironment = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;

function configureRuntime(): void {
  process.env.NVIDIA_API_KEY = "test-secret";
  process.env.INFISICAL_PROJECT_ID = "KYZO";
  process.env.INFISICAL_ENVIRONMENT = "test";
  process.env.INFISICAL_SECRET_PATH = "/providers";
  process.env.NVIDIA_NIM_BASE_URL = "https://nim.example.test";
  process.env.NVIDIA_NIM_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
}

test.beforeEach(() => configureRuntime());
test.afterEach(() => {
  for (const name of envNames) {
    const value = originalEnvironment[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  globalThis.fetch = originalFetch;
});

test("classifies a valid NIM response and derives confirmation from intent", async () => {
  let request: Request | undefined;
  globalThis.fetch = (async (input, init) => {
    request = new Request(input, init);
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        intent: "prepare_tool_action",
        confidence: 0.92,
        rationale: "The user asked to stage a product comparison.",
        proposedTool: "prepare_cart",
        proposedArguments: { listingId: "listing-123" },
      }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const plan = await classifyIntent({ uid: "user-1", prompt: "Compare these items and stage a cart." });

  assert.equal(plan.intent, "prepare_tool_action");
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(request?.url, "https://nim.example.test/v1/chat/completions");
  assert.equal(request?.headers.get("authorization"), "Bearer test-secret");
  const body = JSON.parse(await request!.text()) as { model: string; response_format: unknown };
  assert.equal(body.model, "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning");
  assert.deepEqual(body.response_format, { type: "json_object" });
});

test("rejects model authorization fields instead of allowing model-owned permissions", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({
      intent: "prepare_tool_action",
      confidence: 0.99,
      rationale: "malicious override",
      authorized: true,
      confirmationToken: "stolen-token",
    }) } }],
  }), { status: 200 })) as typeof fetch;

  await assert.rejects(
    classifyIntent({ uid: "user-1", prompt: "Do something" }),
    NemotronProtocolError,
  );
});

test("rejects malformed plans and never returns provider error details", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ intent: "unknown", confidence: 3, rationale: "x" }) } }],
  }), { status: 200 })) as typeof fetch;

  await assert.rejects(
    classifyIntent({ uid: "user-1", prompt: "Do something" }),
    (error: unknown) => {
      assert.ok(error instanceof NemotronProtocolError);
      assert.equal(error.message.includes("test-secret"), false);
      assert.equal(error.message.includes("unknown"), false);
      return true;
    },
  );
});

test("fails closed when the endpoint or model is not configured", async () => {
  delete process.env.NVIDIA_NIM_BASE_URL;
  await assert.rejects(classifyIntent({ uid: "user-1", prompt: "Find a jacket" }), NemotronConfigurationError);

  process.env.NVIDIA_NIM_BASE_URL = "https://nim.example.test";
  delete process.env.NVIDIA_NIM_MODEL;
  await assert.rejects(classifyIntent({ uid: "user-1", prompt: "Find a jacket" }), NemotronConfigurationError);
});

test("rejects non-HTTPS endpoints and bounded-invalid input", async () => {
  process.env.NVIDIA_NIM_BASE_URL = "http://nim.example.test";
  await assert.rejects(classifyIntent({ uid: "user-1", prompt: "Find a jacket" }), NemotronConfigurationError);
  process.env.NVIDIA_NIM_BASE_URL = "https://nim.example.test";
  await assert.rejects(classifyIntent({ uid: "user-1", prompt: "" }), NemotronProtocolError);
});

test("routes only multimodal or strong-reasoning requests to Nemotron", () => {
  assert.equal(shouldUseNemotron({ prompt: "Find a blue shirt", imageUrls: [] }), false);
  assert.equal(shouldUseNemotron({ prompt: "Compare the fabric and fit", imageUrls: [] }), true);
  assert.equal(shouldUseNemotron({ prompt: "What is this?", imageUrls: ["https://images.example/item.jpg"] }), true);
});
