const assert = require("node:assert/strict");
const test = require("node:test");

process.env.GEMINI_API_KEY = "test-gemini-api-key";

const { chatStream } = require("../lib/ai/index.js");

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    finishListeners: [],
    on(event, listener) {
      if (event === "finish") this.finishListeners.push(listener);
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
    end() {
      this.finishListeners.forEach((listener) => listener());
    },
    send() {
      this.finishListeners.forEach((listener) => listener());
    },
  };
}

test("does not grant CORS permission to an unapproved origin", async () => {
  const response = createResponse();
  const request = {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.example.com",
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,x-firebase-appcheck",
    },
    header(name) {
      return this.headers[name.toLowerCase()];
    },
  };

  await chatStream(request, response);

  assert.equal(response.headers["Access-Control-Allow-Origin"], undefined);
});
