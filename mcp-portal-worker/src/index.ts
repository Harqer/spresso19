/**
 * Cloudflare Worker: MCP Server Portal
 * Proxies requests to the internal backend over Cloudflare Tunnel
 * Enforces Zero Trust and applies basic Data Loss Prevention (DLP)
 */

export interface Env {
	// The internal backend URL (routed via Cloudflare Tunnel)
	BACKEND_URL: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// 1. Zero Trust: Ensure request passed through Cloudflare Access
		let cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
		
		// Fallback to checking the CF_Authorization cookie if header is missing
		if (!cfAccessJwt) {
			const cookies = request.headers.get('Cookie') || '';
			const match = cookies.match(/CF_Authorization=([^;]+)/);
			if (match) cfAccessJwt = match[1];
		}

		if (!cfAccessJwt) {
			return new Response(JSON.stringify({ error: 'Unauthorized: Missing Cloudflare Access JWT' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 2. DLP: Basic PII Scrubbing on outbound prompt payloads
		// Example: Mask credit card numbers before they hit the MCP tool server
		let bodyContent = '';
		if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
			bodyContent = await request.text();
			
			// Simple regex to mask 16-digit credit card numbers
			const creditCardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
			bodyContent = bodyContent.replace(creditCardRegex, 'XXXX-XXXX-XXXX-XXXX');
		}

		// 3. Proxy request to the secure backend (over Cloudflare Tunnel)
		const url = new URL(request.url);
		const backendUrl = env.BACKEND_URL || 'http://localhost:8080';
		const targetUrl = new URL(url.pathname + url.search, backendUrl);

		const proxyRequest = new Request(targetUrl.toString(), {
			method: request.method,
			headers: request.headers,
			body: (request.method !== 'GET' && request.method !== 'HEAD') ? bodyContent : null,
		});

		try {
			const response = await fetch(proxyRequest);
			return response;
		} catch (error) {
			return new Response(JSON.stringify({ error: 'Failed to reach internal MCP server' }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	},
} satisfies ExportedHandler<Env>;
