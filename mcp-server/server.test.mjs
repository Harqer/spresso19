import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { httpServer } from "./server.mjs";

let baseUrl;
let server;

test.before(async () => {
  await new Promise((resolve) => {
    server = httpServer.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint is explicit and the MCP route is real", async () => {
  const health = await fetch(`${baseUrl}/`);
  assert.equal(health.status, 200);
  assert.match(await health.text(), /Spresso discovery MCP server/);
  const missing = await fetch(`${baseUrl}/oauth/authorization-server`);
  assert.equal(missing.status, 404);
});

test("MCP CORS allows only configured origins", async () => {
  const previous = process.env.SPRESSO_MCP_ALLOWED_ORIGINS;
  process.env.SPRESSO_MCP_ALLOWED_ORIGINS = "https://trusted.example.test";
  try {
    const allowed = await fetch(`${baseUrl}/mcp`, {
      method: "OPTIONS",
      headers: {
        origin: "https://trusted.example.test",
        "access-control-request-method": "POST",
      },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://trusted.example.test");

    const denied = await fetch(`${baseUrl}/mcp`, {
      method: "OPTIONS",
      headers: {
        origin: "https://untrusted.example.test",
        "access-control-request-method": "POST",
      },
    });
    assert.equal(denied.status, 403);
  } finally {
    if (previous === undefined) delete process.env.SPRESSO_MCP_ALLOWED_ORIGINS;
    else process.env.SPRESSO_MCP_ALLOWED_ORIGINS = previous;
  }
});

test("tool listing contains only read-only discovery tools and real output schemas", async () => {
  const client = new Client({ name: "boundary-test", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    reconnectionOptions: { initialReconnectionDelay: 10, maxReconnectionDelay: 10, reconnectionDelayGrowFactor: 1, maxRetries: 0 },
  });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ["render_discovery_widget", "search_products"]);
  assert.ok(tools.tools.every((tool) => tool.annotations?.readOnlyHint === true));
  assert.equal(tools.tools.find((tool) => tool.name === "search_products")._meta, undefined);
  await client.close();
  await transport.close();
});

test("unconfigured discovery provider fails closed without fabricated listings", async () => {
  const client = new Client({ name: "boundary-test", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    reconnectionOptions: { initialReconnectionDelay: 10, maxReconnectionDelay: 10, reconnectionDelayGrowFactor: 1, maxRetries: 0 },
  });
  await client.connect(transport);
  const result = await client.callTool({ name: "search_products", arguments: { query: "linen jacket" } });
  assert.equal(result.isError, true);
  assert.match(result.content?.[0]?.text, /temporarily unavailable|not available/i);
  await client.close();
  await transport.close();
});

test("invalid tool input is rejected by the MCP SDK schema", async () => {
  const client = new Client({ name: "boundary-test", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    reconnectionOptions: { initialReconnectionDelay: 10, maxReconnectionDelay: 10, reconnectionDelayGrowFactor: 1, maxRetries: 0 },
  });
  await client.connect(transport);
  const result = await client.callTool({ name: "search_products", arguments: { query: "x", extra: "reject" } });
  assert.equal(result.isError, true);
  assert.match(result.content?.[0]?.text, /validation|Unrecognized key/i);
  await client.close();
  await transport.close();
});
