const assert = require("node:assert/strict");
const test = require("node:test");

process.env.GEMINI_API_KEY = "test-gemini-api-key";

const appCheckModule = require("firebase-admin/app-check");
const authModule = require("firebase-admin/auth");
const { ai } = require("../lib/ai/genkit.js");
const { chatStream } = require("../lib/ai/index.js");

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    finishListeners: [],
    chunks: [],
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      this.ended = true;
      this.finishListeners.forEach((listener) => listener());
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    getHeader(name) {
      return this.headers[name];
    },
    removeHeader(name) {
      delete this.headers[name];
    },
    on(event, listener) {
      if (event === "finish") this.finishListeners.push(listener);
      return this;
    },
    write(chunk) {
      this.chunks.push(chunk);
    },
    end() {
      this.ended = true;
      this.finishListeners.forEach((listener) => listener());
    },
  };
}

test("rejects a streaming request that has no Firebase ID token", async (t) => {
  t.mock.method(appCheckModule, "getAppCheck", () => ({
    verifyToken: async () => ({ appId: "app-123" }),
  }));
  t.mock.method(ai, "prompt", () => {
    throw new Error("The model must not run for an unauthenticated request");
  });
  t.mock.method(console, "error", () => {});

  const response = createResponse();

  await chatStream(
    {
      method: "POST",
      headers: {},
      body: { prompt: "Find a rain jacket", locale: "en" },
      header(name) {
        if (name === "X-Firebase-AppCheck") return "valid-app-check-token";
        return undefined;
      },
    },
    response,
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body, "Unauthorized");
  assert.equal(response.ended, true);
});

test("rejects a streaming request whose Firebase ID token is invalid", async (t) => {
  t.mock.method(appCheckModule, "getAppCheck", () => ({
    verifyToken: async () => ({ appId: "app-123" }),
  }));
  t.mock.method(authModule, "getAuth", () => ({
    verifyIdToken: async () => {
      throw new Error("invalid token");
    },
  }));
  t.mock.method(ai, "prompt", () => {
    throw new Error("The model must not run for an unauthenticated request");
  });
  t.mock.method(console, "error", () => {});

  const response = createResponse();

  await chatStream(
    {
      method: "POST",
      headers: {},
      body: { prompt: "Find a rain jacket", locale: "en" },
      header(name) {
        if (name === "X-Firebase-AppCheck") return "valid-app-check-token";
        if (name === "Authorization") return "Bearer invalid-id-token";
        return undefined;
      },
    },
    response,
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body, "Unauthorized");
  assert.equal(response.ended, true);
});

test("rejects a streaming request with an empty prompt before model execution", async (t) => {
  t.mock.method(appCheckModule, "getAppCheck", () => ({
    verifyToken: async () => ({ appId: "app-123" }),
  }));
  t.mock.method(authModule, "getAuth", () => ({
    verifyIdToken: async () => ({ uid: "user-123" }),
  }));
  t.mock.method(ai, "prompt", () => {
    throw new Error("The model must not run for an invalid prompt");
  });
  t.mock.method(console, "error", () => {});

  const response = createResponse();

  await chatStream(
    {
      method: "POST",
      headers: {},
      body: { prompt: "   ", locale: "en" },
      header(name) {
        if (name === "X-Firebase-AppCheck") return "valid-app-check-token";
        if (name === "Authorization") return "Bearer valid-id-token";
        return undefined;
      },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body, "Prompt is required.");
  assert.equal(response.ended, true);
});
