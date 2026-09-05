const assert = require("node:assert/strict");
const test = require("node:test");

process.env.GEMINI_API_KEY = "test-gemini-api-key";

const { generateLiveApiToken } = require("../lib/ai/index.js");

test("issues one model-constrained Live token and returns its token name", async (t) => {
  const originalFetch = global.fetch;
  let observedRequest;

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url, init) => {
    observedRequest = { url, init };
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        name: "ephemeral-live-token",
        uses: 1,
        expireTime: "2026-08-24T05:00:00Z",
        newSessionExpireTime: "2026-08-24T04:31:00Z",
      }),
    };
  };

  const result = await generateLiveApiToken.run({
    auth: { uid: "user-123" },
    app: { appId: "app-123" },
    data: {},
  });

  assert.equal(
    observedRequest.url,
    "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
  );
  assert.equal(observedRequest.init.method, "POST");
  assert.deepEqual(JSON.parse(observedRequest.init.body), {
    uses: 1,
    liveConnectConstraints: {
      model: "models/gemini-3.1-flash-live-preview",
      config: {
        responseModalities: ["AUDIO"],
        sessionResumption: {},
      },
    },
  });
  assert.deepEqual(result, { token: "ephemeral-live-token" });
});

test("rejects a Gemini token response that has no token name", async (t) => {
  const originalFetch = global.fetch;
  t.mock.method(console, "error", () => {});

  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      uses: 1,
      expireTime: "2026-08-24T05:00:00Z",
      newSessionExpireTime: "2026-08-24T04:31:00Z",
    }),
  });

  await assert.rejects(
    generateLiveApiToken.run({
      auth: { uid: "user-123" },
      app: { appId: "app-123" },
      data: {},
    }),
    (error) =>
      error.code === "internal" &&
      error.message === "Failed to generate ephemeral token",
  );
});
