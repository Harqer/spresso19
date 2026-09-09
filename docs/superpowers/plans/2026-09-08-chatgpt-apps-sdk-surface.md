# ChatGPT Apps SDK Discovery Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS before any task: `openai-docs` (authoritative Apps SDK surface — verify every endpoint via the OpenAI Docs MCP before coding), `security-best-practices` (JavaScript/TypeScript server and React frontend references), `convex-expert` (any Convex code touched), `convex-test`. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Expose Spresso discovery to ChatGPT through the Apps SDK: a validated, rate-limited, read-only MCP server plus one product-results widget. No cart, checkout, or account tools until the Apps SDK OAuth phase is designed and approved.

**Architecture:** The MCP server is a stateless Node HTTP service exposing `POST /mcp` via `StreamableHTTPServerTransport`, with `GET /` health. It does not connect directly to Convex or Firebase. It calls an explicitly configured, HTTPS discovery-provider adapter only when that endpoint has been verified in the target environment.

**Verified surface (2026-09-08, official OpenAI Apps SDK quickstart and UI docs):** Node MCP SDK + MCP Apps helpers, stateless mode (`sessionIdGenerator: undefined`, `enableJsonResponse: true`), `POST /mcp`, MCP Apps resource MIME type, `_meta.ui.resourceUri`, and the `ui/*` bridge. This repository also verifies the installed package surface through the executable MCP boundary tests.

## Global Constraints

- Read-only discovery tools only: `search_products` and `render_discovery_widget`.
- No cart, checkout, purchase, account, wallet, or write tools.
- The MCP server never holds a database credential. A discovery-provider adapter token is server-only.
- Every tool input and output is closed-world schema validated.
- Merchant and provider content is untrusted data; tool descriptions never interpolate it as instructions.
- Rate limits and response bounds fail closed.
- No user PII, secrets, internal hostnames, provider names, or infrastructure detail in user-visible strings.
- Do not deploy or create cloud resources without owner approval.

## APP-001 status

**Implemented files:**

- `mcp-server/server.mjs`
- `mcp-server/convexClient.mjs`
- `mcp-server/server.test.mjs`
- `mcp-server/README.md`
- package dependencies in `package.json` and `package-lock.json`

**Endpoint behavior:**

- `GET /` returns the health text.
- `POST /mcp` is the actual stateless MCP transport endpoint.
- `GET /mcp` and `DELETE /mcp` return `405` until sessions/auth are designed.
- OAuth discovery routes return `404` because OAuth is intentionally out of scope.
- With no verified discovery-provider configuration, `search_products` returns a
  typed error and no mock or placeholder listings.

**Important endpoint correction:** The earlier plan described a Convex
`/api/catalog/search` route and an internal service key without a migrated
Convex discovery contract. Those are not implemented or claimed. SerpApi,
Parallel, Apify, and Kitesurf are active discovery providers; their current
Firebase Functions wrappers are the migration boundary. `SPRESSO_MCP_DISCOVERY_ENDPOINT`
and `SPRESSO_MCP_DISCOVERY_TOKEN` are explicit integration points pending a
real endpoint verification and provider-adapter migration ticket.

## Verification

```bash
node --test mcp-server/server.test.mjs
npx tsc --noEmit --pretty false
npx convex dev --once
```

The tests exercise the real HTTP/MCP package APIs, tool listing, schema
rejection, widget binding separation, and fail-closed unconfigured behavior.

## Follow-on phases

1. Verify and migrate a real discovery-provider adapter contract.
2. Add the authenticated user mapping and OAuth discovery routes through the
   official Apps SDK auth documentation.
3. Add trusted UI checkout preparation only after the owner approves the
   OAuth/payment design. Agents still cannot submit payment or sign wallets.
