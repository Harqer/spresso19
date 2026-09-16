# Spresso ChatGPT Apps SDK surface

This directory contains the read-only MCP Apps surface for product discovery.
It is a separate server boundary from the Convex function code and does not
connect to a database directly.

## Verified endpoint contract

The OpenAI Apps SDK quickstart was checked against the official page on
2026-09-08:

- MCP endpoint: `POST /mcp` using the Node SDK
  `StreamableHTTPServerTransport` in stateless JSON-response mode.
- Health endpoint: `GET /`.
- `GET /mcp` and `DELETE /mcp` return `405` until resumable sessions and OAuth
  are intentionally added.
- OAuth discovery routes are not implemented and return `404`; this is
  deliberate because this first surface has no user-account authorization.
- UI resources use the MCP Apps MIME type supplied by
  `@modelcontextprotocol/ext-apps/server` (`text/html;profile=mcp-app`).
- The widget uses the standard MCP Apps `ui/*` bridge concept. It renders
  `structuredContent` with DOM text APIs and does not evaluate returned text.

The actual installed versions are resolved by `package-lock.json`; the source
uses the current installed APIs rather than a remembered endpoint shape.

## Tools

- `search_products`: read-only discovery search. It returns no UI template so
  the model can refine results first.
- `render_discovery_widget`: read-only presentation tool. It accepts the closed
  output shape of `search_products` and is the only tool associated with the
  widget resource.

There are no cart, checkout, payment, wallet, account, or purchase tools in this
surface. Adding those requires the separately designed OAuth and trusted-user
confirmation phase.

### OpenClaw relationship

Sandbox-facing OpenClaw tools (search, bounded page reading, confirmation-gated
cart preparation) live in `services/openclaw/` and are validated by the NeMo
Guardrails boundary in `services/guardrails/`. They are executed only inside a
NemoClaw/OpenShell sandbox and are reachable only through the authenticated
orchestration boundary (`functions/src/ai/orchestration/agentOrchestrator.ts`).
This ChatGPT-facing MCP surface never exposes those preparation tools, and no
tool anywhere in the stack submits payment, signs transactions, or claims a
completed purchase — final purchase remains exclusively in the trusted UI.

## Catalog boundary

The environment must explicitly provide:

- `SPRESSO_MCP_DISCOVERY_ENDPOINT`: an HTTPS endpoint that has been verified as
  a live discovery-provider adapter in the target environment.
- `SPRESSO_MCP_DISCOVERY_TOKEN`: server-only credential for that adapter.

Until both are present, `search_products` fails closed with a customer-safe
error and returns no fabricated listings. The repository currently does not
claim that a Convex discovery HTTP endpoint exists. SerpApi, Parallel, Apify,
and Kitesurf remain active external discovery providers; their current Firebase
Functions wrappers are the migration boundary, not the providers themselves.

## Local contract verification

This is a production-shaped protocol test, not a fake catalog integration:

```bash
node --test mcp-server/server.test.mjs
```

The test verifies the actual local HTTP route, MCP tool listing, schema
rejection, and fail-closed behavior. It does not create or deploy cloud
resources. Use the MCP Inspector only after selecting an explicitly approved
non-production server process.

## Deployment boundary

OpenAI does not host this process. Deploy the container to an operator-controlled
HTTPS service, then use its stable `/mcp` URL in ChatGPT developer mode or the
OpenAI plugin submission portal. The container listens on the platform-provided
`PORT` and binds to `HOST` (default `0.0.0.0`).

Before deployment, configure these values in the host's secret manager:

- `SPRESSO_MCP_DISCOVERY_ENDPOINT` — verified HTTPS discovery-provider adapter.
- `SPRESSO_MCP_DISCOVERY_TOKEN` — server-only adapter credential.
- `SPRESSO_MCP_ALLOWED_ORIGINS` — exact browser origins permitted by the host.

Do not deploy until the catalog endpoint and token are real and health-checked;
the server intentionally returns a safe unavailable response when either is
missing.
