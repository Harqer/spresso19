import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserTools } from "../tools/browser";

test("page reader prevents redirect requests from leaving the allowed host", async () => {
  const original = process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS;
  process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS = "shop.example";
  try {
    let redirectMode;
    const tools = createBrowserTools({
      resolveHost: async () => [{ address: "93.184.216.34", family: 4 }],
      validateToolCall: async () => ({ allowed: true }),
      validateToolResult: async () => ({ allowed: true }),
      fetchImpl: async (_url, options) => {
        redirectMode = options?.redirect;
        return new Response(null, { status: 302, headers: { location: "https://internal.example/" } });
      },
    });
    await assert.rejects(tools.readProductPage({ url: "https://shop.example/coat" }, { uid: "user-1", correlationId: "call-1" }));
    assert.ok(redirectMode === "error" || redirectMode === "manual");
  } finally {
    if (original === undefined) delete process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS;
    else process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS = original;
  }
});
