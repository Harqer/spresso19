import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker, { type Env } from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("MCP portal access boundary", () => {
	it("rejects requests without a Cloudflare Access assertion", async () => {
		const request = new IncomingRequest("https://example.com");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized: Missing Cloudflare Access JWT" });
	});

	it("passes authenticated requests to the configured backend boundary", async () => {
		const request = new IncomingRequest("https://example.com/mcp?query=1", {
			headers: { "Cf-Access-Jwt-Assertion": "test-assertion" },
		});
		const ctx = createExecutionContext();
		const testEnv = { BACKEND_URL: "http://127.0.0.1:9" } satisfies Env;
		const response = await worker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: "Failed to reach internal MCP server" });
	});
});
