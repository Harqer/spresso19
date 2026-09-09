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

## Catalog boundary

The environment must explicitly provide:

- `SPRESSO_MCP_CATALOG_ENDPOINT`: an HTTPS endpoint that has been verified as a
  live catalog gateway in the target environment.
- `SPRESSO_MCP_CATALOG_TOKEN`: server-only credential for that gateway.

Until both are present, `search_products` fails closed with a customer-safe
error and returns no fabricated listings. The repository currently does not
claim that a Convex catalog HTTP endpoint exists; the prior catalog source is
still in Firebase/Kitesurf code, so no Convex URL has been invented.

## Local contract verification

This is a production-shaped protocol test, not a fake catalog integration:

```bash
node --test mcp-server/server.test.mjs
```

The test verifies the actual local HTTP route, MCP tool listing, schema
rejection, and fail-closed behavior. It does not create or deploy cloud
resources. Use the MCP Inspector only after selecting an explicitly approved
non-production server process.
