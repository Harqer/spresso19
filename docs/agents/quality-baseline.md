# Quality baseline

Authoritative commands and architecture boundaries for anti-slop audits. Derived from `package.json`, `scripts/ci-gate.sh`, and `docs/testing.md`.

## Canonical architecture

| Layer | Owner | Notes |
| --- | --- | --- |
| User-scoped state | Convex (`convex/`) | Auth via Firebase JWT verified in Convex; clients never supply identity |
| KMP clients | `composeApp/` + `convex/http.ts` bridge | HTTPS + Bearer token, not duplicate business rules |
| KMP UI | `composeApp/` (Android, iOS, wasmJs) | Primary customer UI; wardrobe at `WardrobeViewPage.kt` |
| Web helpers | `src/lib/` + Convex React client | No `src/components/` React tree; no imports from legacy `src/db/` |
| Discovery listings | External providers via `convex/discovery.ts` | No owned product inventory in Firestore/Convex |
| Commerce | Stripe + `convex/commerce/` | Fresh merchant quote at checkout; webhook reconciliation |
| Legacy PostgreSQL | `src/db/`, `server/apifyService.ts` | Apify feed only; not a web client path |
| Firebase Functions | `functions/src/` | Genkit/media gateway; not the primary KMP data plane |
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

- `src/` → Convex client, Firebase Auth, Stripe.js. Must not import `src/db/`.
- `convex/http.ts` → domain modules only; transport validation in `convex/lib/bridge.ts`.
- `composeApp/` → `ConvexApi.kt` bridge routes, not parallel REST handlers with duplicate auth.
- `functions/` → Genkit tools and media providers; no synthetic success payloads in production paths.

## Intentional exceptions

- Media provider fallback chains in `functions/src/ai/providers/mediaGateway.ts` when secrets for alternate providers exist.
- `server/apifyService.ts` reads legacy PostgreSQL for Apify product feed ingestion.
- Stripe API version pin `2025-01-27.acacia` cast to `Stripe.LatestApiVersion` until SDK types catch up.
- `SpressoAccessibilityService` exists in `composeApp` but is not registered in any `AndroidManifest.xml`. Live Lens uses MediaProjection only. Do not treat the accessibility class as the capture path, and do not delete it as dead code until product confirms the one-shot accessibility screenshot is abandoned.
- Firebase `functions/src/ai/lensSearch.ts` is the legacy Apify callable. KMP Lens search uses Convex `/api/vision/search`.

## Mechanical checks (CI)

- `scripts/universal_mock_scanner.cjs --strict-production` via `npm run test:smoke`
- `scripts/test/production-hardcoding-boundary.test.mjs` (no browser Gemini SDK / synthetic UI claims)
- `scripts/test/web-legacy-boundary.test.mjs` (no web → Postgres imports)
- `scripts/test/convex-bridge-boundary.test.mjs` (no `as any` in HTTP bridge)
- `scripts/test/convex-cutover.test.mjs` (KMP uses Convex transport)
- Forbidden project identifiers in `scripts/ci-gate.sh`
