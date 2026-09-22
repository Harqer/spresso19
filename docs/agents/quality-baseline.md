# Quality baseline

Authoritative commands and architecture boundaries for anti-slop audits. Derived from `package.json`, `scripts/ci-gate.sh`, and `docs/testing.md`.

## Canonical architecture

| Layer | Owner | Notes |
| --- | --- | --- |
| User-scoped state | Convex (`convex/`) | Auth via Firebase JWT verified in Convex; clients never supply identity |
| KMP clients | `composeApp/` + `convex/http.ts` bridge | HTTPS + Bearer token, not duplicate business rules |
| KMP UI | `composeApp/` (Android, iOS, wasmJs) | Primary customer UI; wardrobe at `WardrobeViewPage.kt` |
| Web client | `composeApp` wasmJs target served by Firebase Hosting | There is no separate React web client; `src/` is deleted |
| Discovery listings | External providers via `convex/discovery.ts` | No owned product inventory in Firestore/Convex |
| Commerce | Stripe + `convex/commerce/` | Fresh merchant quote at checkout; webhook reconciliation (`/stripe_webhook`) |
| Firebase Functions | `functions/src/` | Genkit/media gateway only: VTO, live token, chef/audio/outfit generation, shopper SSE stream, telemetry fan-out |
| Bridge health | Convex `GET /api/health` | Readiness payload with dependency map; 200/503 are both healthy statuses |
| Lens | Android `MediaProjectionScreenCapture` | Screen inspection of a user-approved frame. Not camera, gallery pick, DAT wearable camera, or html2canvas |
| Phone camera | CameraX / image picker | Physical-world photo for chat/VTO. Must not stand in for Lens |
| Meta wearable camera | DAT session camera | Separate from Lens; cannot submit payment |

Stale wiki copy under `docs/wiki/docs/architecture.md` describes a pre-Convex web stack. Treat this file and `scripts/test/convex-cutover.test.mjs` as current for cutover state.

## Verification commands

```bash
# Typecheck and web build
npm run lint
npm run build

# Convex contracts
npx vitest run convex --passWithNoTests
npx tsc -p convex/tsconfig.json --noEmit --pretty false

# Structural / boundary tests
npm run test:smoke
npm run test:contracts
npm run test:ci-wiring
npm run test:convex-cutover
node --test scripts/test/web-legacy-boundary.test.mjs
node --test scripts/test/discovery-boundary.test.mjs
node --test scripts/test/convex-bridge-boundary.test.mjs
node --test scripts/test/lens-boundary.test.mjs

# MCP (needs loopback)
npm run test:mcp

# Android unit tests
./gradlew :composeApp:allTests
```

Full production gate: `scripts/ci-gate.sh`.

## Dependency direction

- `composeApp/` → `ConvexApi.kt` bridge routes, not parallel REST handlers with duplicate auth.
- `convex/http.ts` → domain modules only; transport validation in `convex/lib/bridge.ts`.
- `functions/` → Genkit tools and media providers only; no business reads that duplicate Convex tables, no synthetic success payloads.
- There is no `src/` web client tree; do not reintroduce one alongside the wasmJs target.

## Intentional exceptions

- Media provider fallback chains in `functions/src/ai/providers/mediaGateway.ts` when secrets for alternate providers exist.
- `@google/genai` direct SDK imports inside `functions/src/ai/` (media gateway); the Convex backend routes models through the Convex Agent Gateway only.
- Stripe API version pin `2025-01-27.acacia` cast to `Stripe.LatestApiVersion` until SDK types catch up.
- `SpressoAccessibilityService` exists in `composeApp` but is not registered in any `AndroidManifest.xml`. Live Lens uses MediaProjection only. Do not treat the accessibility class as the capture path, and do not delete it as dead code until product confirms the one-shot accessibility screenshot is abandoned.

## Mechanical checks (CI)

- `scripts/universal_mock_scanner.cjs --strict-production` via `npm run test:smoke`
- `scripts/test/production-hardcoding-boundary.test.mjs` (no browser env references / synthetic UI claims in convex/ + functions/src)
- `scripts/test/deployed-capability-audit.mjs` (production-endpoints manifest matches the `convex/http.ts` route inventory at the production Convex site)
- `scripts/test/web-legacy-boundary.test.mjs` (no legacy React/Postgres web tree under `src/`)
- `scripts/test/convex-bridge-boundary.test.mjs` (no `as any` in HTTP bridge)
- `scripts/test/convex-cutover.test.mjs` (KMP uses Convex transport)
- `scripts/test/bundle-budget.test.mjs` (wasm bundle size gate)
- `scripts/verify-action-contract.mjs` (UI actions resolve to real Convex bridge routes)
- Forbidden project identifiers in `scripts/ci-gate.sh`
