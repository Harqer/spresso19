import assert from "node:assert/strict";
import test from "node:test";
import { createDiscoveryTools } from "../tools/discovery";
import { createBrowserTools } from "../tools/browser";

const context = { uid: "user-1", correlationId: "call-1" };
const allow = async () => ({ allowed: true });
const listing = { id: "l-1", name: "Coat", merchantUrl: "https://shop.example/coat", source: "parallel" };

function discovery(overrides = {}) {
  return createDiscoveryTools({
    catalog: { configured: true, searchProducts: async () => ({ listings: [listing] }) },
    validateToolCall: allow,
    validateToolResult: allow,
    ...overrides,
  });
}

function browser(overrides = {}) {
  process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS = "shop.example,127.0.0.1,localhost";
  return createBrowserTools({
    validateToolCall: allow,
    validateToolResult: allow,
    resolveHost: async () => [{ address: "93.184.216.34", family: 4 }],
    fetchImpl: async () => new Response("<title>Coat</title><script>evil()</script><p>Wool coat</p>", { headers: { "content-type": "text/html" } }),
    ...overrides,
  });
}

test("discovery requires trusted context and does not accept caller authorization fields", async () => {
  await assert.rejects(discovery().searchProducts({ query: "coat", uid: "victim" }));
  await assert.rejects(discovery().searchProducts({ query: "coat" }));
});

test("discovery validates provider results and propagates result policy denial", async () => {
  await assert.rejects(discovery({ catalog: { configured: true, searchProducts: async () => ({ listings: [{ ...listing, stock: 10 }] }) } }).searchProducts({ query: "coat" }, context));
  await assert.rejects(discovery({ validateToolResult: async () => ({ allowed: false }) }).searchProducts({ query: "coat" }, context));
  assert.deepEqual(await discovery().searchProducts({ query: "coat" }, context), { listings: [listing] });
});

test("guardrails links the actual invocation and denies malformed decisions", async () => {
  let call;
  const tools = discovery({
    validateToolCall: async (value) => { call = value; return { allowed: true }; },
    validateToolResult: async (value) => {
      assert.equal(value.correlationId, "call-1");
      assert.equal(value.toolName, "search_products");
      assert.equal(value.toolCallId, call.toolCallId);
      assert.deepEqual(value.knownCallIds, [call.toolCallId]);
      return { allowed: true };
    },
  });
  await tools.searchProducts({ query: "coat" }, context);
  await assert.rejects(discovery({ validateToolCall: async () => ({ allowed: "true" }) }).searchProducts({ query: "coat" }, context));
});

test("cart preparation cannot fabricate success when executor is absent", async () => {
  await assert.rejects(discovery({ consumeConfirmation: async () => ({ accepted: true }) }).prepareCart({ listingId: "l-1" }, { ...context, confirmationToken: "token" }));
});

test("cart confirmation is server verified, action and arguments bound, expired and replay rejected", async () => {
  const consumed = new Set();
  let writes = 0;
  const tools = discovery({
    now: () => 1_000,
    consumeConfirmation: async (token, binding) => {
      if (token !== "good" || consumed.has(token) || binding.uid !== context.uid || binding.correlationId !== context.correlationId || binding.action !== "prepare_cart" || binding.arguments.listingId !== "l-1") return null;
      consumed.add(token);
      return { accepted: true };
    },
    executePreparation: async (id, trusted) => {
      assert.equal(trusted.uid, "user-1");
      writes += 1;
      return { status: "staged", listingId: id };
    },
  });
  await assert.rejects(tools.prepareCart({ listingId: "l-1" }, { uid: "other", correlationId: context.correlationId, confirmationToken: "good" }));
  await assert.rejects(tools.prepareCart({ listingId: "l-1" }, { uid: context.uid, correlationId: "other", confirmationToken: "good" }));
  await assert.rejects(tools.prepareCart({ listingId: "other" }, { ...context, confirmationToken: "good" }));
  assert.deepEqual(await tools.prepareCart({ listingId: "l-1" }, { ...context, confirmationToken: "good" }), { status: "staged", listingId: "l-1" });
  await assert.rejects(tools.prepareCart({ listingId: "l-1" }, { ...context, confirmationToken: "good" }));
  assert.equal(writes, 1);
  await assert.rejects(discovery({ now: () => 2_000, consumeConfirmation: async () => ({ accepted: true }), executePreparation: async () => { throw Error("must not run"); } }).prepareCart({ listingId: "l-1" }, { ...context, confirmationToken: "expired" }));
});

test("checkout request uses server correlation and exposes no final purchase", async () => {
  assert.deepEqual(await discovery().requestCheckoutConfirmation({}, context), { requiresTrustedUi: true, correlationId: "call-1" });
  assert.deepEqual(Object.keys(discovery()).sort(), ["prepareCart", "requestCheckoutConfirmation", "searchProducts"]);
});

test("page read denies credentials, ports, private IPs, private DNS and HTTP before fetching", async () => {
  let requests = 0;
  const tools = browser({ fetchImpl: async () => { requests += 1; throw Error("unexpected fetch"); } });
  for (const url of ["http://shop.example/", "https://user:pass@shop.example/", "https://shop.example:444/", "https://127.0.0.1/", "https://localhost/", "https://evil.example/"]) await assert.rejects(tools.readProductPage({ url }, context));
  await assert.rejects(browser({ resolveHost: async () => [{ address: "169.254.169.254", family: 4 }], fetchImpl: async () => { requests += 1; throw Error("unexpected fetch"); } }).readProductPage({ url: "https://shop.example/" }, context));
  assert.equal(requests, 0);
});

test("page read forbids redirect following and cancels redirect bodies", async () => {
  let cancelled = false;
  await assert.rejects(browser({ fetchImpl: async (_url, options) => {
    assert.equal(options.redirect, "manual");
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 302, headers: { location: "http://169.254.169.254/", "content-type": "text/html" } });
  } }).readProductPage({ url: "https://shop.example/" }, context));
  assert.equal(cancelled, true);
});

test("page read stops streaming at byte cap instead of buffering the entire download", async () => {
  let reads = 0;
  let cancelled = false;
  await assert.rejects(browser({ fetchImpl: async () => new Response(new ReadableStream({ pull(controller) { reads += 1; controller.enqueue(new Uint8Array(128 * 1024)); if (reads === 100) controller.close(); }, cancel() { cancelled = true; } }), { headers: { "content-type": "text/html" } }) }).readProductPage({ url: "https://shop.example/" }, context));
  assert.ok(reads < 10);
  assert.equal(cancelled, true);
});

test("page text is sanitized, marked untrusted and checked by output guardrails", async () => {
  const result = await browser().readProductPage({ url: "https://shop.example/" }, context);
  assert.equal(result.text.includes("evil()"), false);
  assert.ok(result.text.includes("Wool coat"));
  assert.equal(result.untrusted, true);
  await assert.rejects(browser({ validateToolResult: async () => ({ allowed: false }) }).readProductPage({ url: "https://shop.example/" }, context));
});
