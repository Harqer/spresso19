# Bunny Media, Cutover, and FinOps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move only real static/media traffic to Bunny, retire each legacy provider after proof, and turn cost assumptions into measured unit-cost gates.

**Architecture:** Application metadata stores stable media keys, never provider URLs. A Convex Node action uses a server-only `MediaStore` to write generated assets to Bunny Storage over the HTTP API and returns short-lived signed CDN URLs for private objects. The SPA moves to Bunny only after dynamic `/api/**` routing is removed from Firebase Hosting. Provider retirement is domain-by-domain and FinOps uses real usage samples rather than fabricated savings.

**Tech Stack:** Bunny Storage, Bunny CDN, Bunny token authentication, Bunny Stream only for adaptive/managed video, TypeScript, Vite, Firebase Auth, Node test runner, GitNexus.

**Spec:** `docs/superpowers/specs/2026-09-05-platform-cost-migration-design.md`

## Global Constraints

- Do not create Bunny storage zones, pull zones, Stream libraries, custom domains, or DNS records without separate owner approval.
- Never expose `BUNNY_STORAGE_ACCESS_KEY`, CDN token keys, or Stream API keys to a browser or KMP client.
- REQUIRED SKILLS: `bunnyway/cli@bunny-cli` (installed) governs CLI-first resource operations; bunny.net official docs (https://docs.bunny.net) govern Storage API and token-auth details. The `docs.bunny.net@bunny` skills.sh listing was broken at plan time (invalid repo spec); fall back to bunny.net/docs and record that fallback in ticket evidence.
- Bunny's S3-compatible API is public preview as of this plan. Do not make direct client uploads depend on it. Use the stable HTTP Storage API from trusted server code — preferably via the official `@bunny.net/storage-sdk` TypeScript SDK (server-side only, installed in the Convex Node action layer, never bundled to web/KMP clients).
- Migrate server-generated image/short-video bytes first. Keep onboarding avatar upload on the legacy adapter until a measured need justifies a bounded authenticated upload ingress.
- Use Bunny Stream only when transcoding, adaptive playback, resumable large uploads, or managed protection is required. Short completed MP4/WebM remains ordinary Storage/CDN content.
- Public and private objects use separate cache policy and key namespaces. Private URLs are signed and short lived.
- Content metadata stores `mediaKey`, `visibility`, `mimeType`, `byteLength`, and checksum. It does not store a Bunny hostname or signed URL.
- Run GitNexus impact before symbol edits, write failing tests first, and run full detect-changes before each commit.

---

### Task 1: BUN-001 — Add a provider-neutral media boundary

**Files:**

- Create: `convex/media/store.ts`
- Create: `convex/media/bunnyStore.ts`
- Create: `convex/media/mediaKey.ts`
- Create: `convex/media/boundary.ts`
- Create: `convex/media/actions.ts`
- Create: `convex/media.ts`
- Create: `convex/media/mediaStore.test.ts`
- Modify: `convex/ai/jobs.ts`
- Modify: `src/services/backend/contracts.ts`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**

- Produces:

```ts
export type StoredMedia = {
  mediaKey: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
};

export interface MediaStore {
  putGenerated(input: {
    ownerUid: string;
    jobId: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<StoredMedia>;
  createReadUrl(input: { mediaKey: string; expiresInSeconds: number }): Promise<string>;
  delete(mediaKey: string): Promise<void>;
}
```

- Produces content-addressed keys: `private/users/{uid}/generated/{sha256}.{ext}`.
- Preserves the current 25 MiB generated-output limit and MIME allow-list.

- [ ] **Step 1: Run impact analysis**

```bash
node .gitnexus/run.cjs context "persistGeneratedMedia" --repo .
node .gitnexus/run.cjs impact "persistGeneratedMedia" --direction upstream --repo .
node .gitnexus/run.cjs query "generated media persistence virtual try on" --repo .
```

The current index may be stale or lower-bound. Confirm active imports with `rg` if impact is UNKNOWN or omits TypeScript callers.

- [ ] **Step 2: Write failing contract/security tests**

Cover deterministic keys, duplicate-byte deduplication, unsupported MIME, empty/oversized content, path traversal, owner isolation, short expiry, tampered token, missing server secret, upstream download timeout, failed write cleanup, and delete idempotency. Assert no returned metadata contains an access key or storage-zone hostname.

- [ ] **Step 3: Run and verify RED**

```bash
npx vitest run convex/media/mediaStore.test.ts
```

Expected: FAIL because the media boundary and Bunny adapter do not exist.

- [ ] **Step 4: Implement the boundary and key derivation**

Port the current `decodeGeneratedMedia` validation into the target boundary and preserve its 25 MiB limit. Derive SHA-256 while reading bytes, map only PNG/JPEG/WebP/MP4/WebM, and construct the key from trusted UID plus digest. Reject user-provided paths and response content types outside the allow-list.

- [ ] **Step 5: Implement the server-only Bunny adapter**

Put `"use node"` in `convex/media/actions.ts`. Use Bunny's stable HTTP Storage API from trusted action code via the official `@bunny.net/storage-sdk` (or raw HTTP where the SDK lacks a surface), with explicit `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_HOST`, `BUNNY_STORAGE_ACCESS_KEY`, `BUNNY_CDN_BASE_URL`, and `BUNNY_CDN_TOKEN_KEY`. Upload with `Content-Type` and checksum metadata where supported. Use an abort timeout and bounded retries only for idempotent PUT/DELETE operations. Implement the current documented advanced token-auth algorithm exactly and cap private-read expiry at 15 minutes; do not invent a signing format. Where the `bunny` CLI covers an operation (zone/library creation, purge, auth checks via `bunny api GET /user`), prefer CLI-first per the bunny-cli skill — resource creation still requires owner approval.

- [ ] **Step 6: Inject `MediaStore` into target AI-job persistence**

Route completed output in `convex/ai/jobs.ts` through the internal Node action and persist the stable `mediaKey` through `convex/media.ts`, then mint a read URL on demand. Do not edit or delete `functions/src/ai/virtualTryOnStorage.ts` yet; it remains rollback-only until the domain observation and retirement gate.

- [ ] **Step 7: Verify GREEN**

```bash
npx vitest run convex/media/mediaStore.test.ts convex/ai/agent.test.ts
npx convex codegen
npm run lint
npm run build
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 8: Commit**

```bash
git add convex/media convex/media.ts convex/ai/jobs.ts src/services/backend/contracts.ts package.json package-lock.json .env.example
git commit -m "feat: add signed bunny media storage boundary"
```

### Task 2: BUN-001 — Rehearse generated-media migration and lifecycle

**Files:**

- Create: `scripts/migrations/export-firebase-media.mjs`
- Create: `scripts/migrations/import-bunny-media.mjs`
- Create: `scripts/migrations/reconcile-bunny-media.mjs`
- Create: `scripts/test/bunny-media-migration.test.mjs`
- Create: `docs/operations/bunny-media-runbook.md`
- Modify: `contracts/domain-cutovers.json`
- Modify: `convex/ai/jobs.ts`
- Modify: `storage.rules`
- Modify: `firebase.json`

**Interfaces:**

- Produces a canonical manifest: `sourceKey`, `targetMediaKey`, `mimeType`, `byteLength`, `sha256`, `visibility`, `ownerUid`, and `status`.
- Produces a reconciliation result with source count/bytes, target count/bytes, checksum mismatches, missing objects, and orphan objects.

- [ ] **Step 1: Write failing migration tests**

Fixtures cover duplicate content, interrupted import, retry, checksum mismatch, missing source, forbidden MIME, and an orphan target. Require idempotent re-run and zero mismatches before cutover.

- [ ] **Step 2: Run and verify RED**

Run `node --test scripts/test/bunny-media-migration.test.mjs`.

Expected: FAIL because the migration scripts do not exist.

- [ ] **Step 3: Implement streaming export/import**

Read source objects as streams, calculate SHA-256, and PUT to the target without converting large objects to base64. Use a concurrency limit of four, exponential backoff for retryable failures, and a durable newline-delimited progress manifest. A re-run skips only a checksum-confirmed object.

- [ ] **Step 4: Add lifecycle and privacy policy**

The runbook defines private generated media, public immutable catalog media, explicit retention for abandoned jobs, and deletion propagation. CDN responses use `private, no-store` for signed private URLs at application boundaries and `public, max-age=31536000, immutable` only for content-addressed public objects. Never cache authenticated HTML or API responses.

- [ ] **Step 5: Rehearse without production cutover**

After owner approval, create development-only zones and migrate a fixture set plus an approved sample. Validate MIME, checksum, signed URL expiry, tampered token rejection, range requests for MP4/WebM, CORS, purge behavior, deletion, and origin failure. Record byte counts, cache-hit ratio, and egress for the sample.

- [ ] **Step 6: Cut over generated media only**

Switch the generated-media domain flag in `contracts/domain-cutovers.json` to the Bunny target and keep the legacy Functions path available for rollback. Leave onboarding avatar upload on `FirebaseLegacyGateway`. Observe one normal retention interval before making the legacy bucket read-only. Do not delete source bytes in this task.

- [ ] **Step 7: Verify GREEN and commit**

```bash
node --test scripts/test/bunny-media-migration.test.mjs
node scripts/migrations/reconcile-bunny-media.mjs --manifest /tmp/spresso-bunny-media.ndjson
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
git add scripts/migrations scripts/test/bunny-media-migration.test.mjs docs/operations/bunny-media-runbook.md contracts/domain-cutovers.json convex/ai/jobs.ts storage.rules firebase.json
git commit -m "feat: rehearse bunny generated-media cutover"
```

### Task 3: BUN-002 — Move static hosting after the API split

**Files:**

- Create: `scripts/test/static-hosting-contract.test.mjs`
- Create: `scripts/smoke/bunny-hosting-smoke.mjs`
- Create: `docs/operations/bunny-static-hosting-runbook.md`
- Create: `bunny/static-hosting.headers.json`
- Modify: `firebase.json`
- Modify: `.github/workflows/release.yml`
- Modify: `package.json`

**Interfaces:**

- Produces immutable caching for hashed JS/CSS/media and a short-cache `index.html`.
- Preserves SPA deep links and security headers.
- Requires API calls to use the explicit configured application API origin; no `/api/**` Firebase Hosting rewrite remains.

- [ ] **Step 1: Prove the API split is complete**

Use GitNexus route mapping/query plus text search to enumerate every `/api/**` consumer and the current `webApi` handler. Stop if any production UI still relies on same-origin Firebase Hosting rewrites.

- [ ] **Step 2: Write the failing hosting contract**

Require:

- one explicit HTTPS API base URL in the backend gateway;
- no `/api/**` rewrite in the target hosting config;
- SPA fallback to `/index.html`;
- `index.html` cache no longer than five minutes;
- one-year immutable caching only for hashed assets;
- CSP, HSTS, `nosniff`, referrer, and permissions-policy headers;
- source maps excluded from the public artifact unless release policy explicitly allows them.

- [ ] **Step 3: Run and verify RED**

Run `node --test scripts/test/static-hosting-contract.test.mjs`.

Expected: FAIL because `firebase.json` still routes `/api/**` to `webApi` and Bunny hosting config is absent.

- [ ] **Step 4: Add the target static-hosting contract**

Build with content hashes. Publish assets first and `index.html` last. Configure SPA fallback and headers in Bunny. Keep the existing Firebase site as rollback during the observation window; do not mirror authenticated API responses through the CDN.

- [ ] **Step 5: Add release and smoke gates**

The release workflow builds once, verifies artifact hashes, uploads to a versioned prefix, activates that release, and runs smoke tests for `/`, a deep link, one hashed asset, CSP, cache headers, API origin, and 404 behavior. A failed smoke test restores the previous active prefix.

- [ ] **Step 6: Verify GREEN in development and commit**

```bash
node --test scripts/test/static-hosting-contract.test.mjs
node scripts/smoke/bunny-hosting-smoke.mjs --base-url "$BUNNY_STAGING_URL"
npm run build
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
git add scripts/test/static-hosting-contract.test.mjs scripts/smoke/bunny-hosting-smoke.mjs docs/operations/bunny-static-hosting-runbook.md bunny/static-hosting.headers.json firebase.json .github/workflows/release.yml package.json
git commit -m "feat: add bunny static hosting release path"
```

### Task 4: CUT-001 — Retire legacy providers by domain

**Files:**

- Create: `contracts/provider-retirement.json`
- Create: `scripts/verify-provider-retirement.mjs`
- Create: `scripts/test/provider-retirement.test.mjs`
- Create: `docs/operations/provider-retirement-runbook.md`
- Modify: `firebase.json`
- Modify: `.firebaserc`
- Modify: `package.json`
- Modify: `functions/package.json`
- Modify: `composeApp/build.gradle.kts`
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/spresso-multi-agent-cicd.yml`
- Delete only after domain gates pass: retired Firebase Functions, Firestore data/rules/index entries, Data Connect configuration/generated SDKs, Storage integration, Pub/Sub integration, PGAdapter/Cloud SQL, Spanner, and obsolete Terraform

**Interfaces:**

- Produces one record per retired domain: target owner, source owner, source freeze time, final-delta proof, count/hash proof, observation deadline, rollback deadline, deletion approval, and deletion evidence.
- Produces `node scripts/verify-provider-retirement.mjs` which fails on duplicate active owners or a retired provider import.

- [ ] **Step 1: Write the failing retirement contract tests**

The test loads `contracts/backend-ownership.json` and `contracts/provider-retirement.json`, then rejects retirement without reconciliation, rollback evidence, owner approval, or a passed observation deadline. Static checks reject active imports/config for a provider whose domain state is `retired`.

- [ ] **Step 2: Run and verify RED**

Run `node --test scripts/test/provider-retirement.test.mjs`.

Expected: FAIL because retirement evidence does not exist.

- [ ] **Step 3: Retire callers before services**

For each domain, run GitNexus impact/context and confirm UNKNOWN/zero results with `rg`. Switch the typed gateway, freeze legacy writes, import the final delta, reconcile, observe, and mark the source read-only. Delete code/config only after the owner approves the recorded remote teardown.

- [ ] **Step 4: Retire in this order**

1. Firestore logs and no-op Pub/Sub pipeline.
2. Migrated personal-state callable Functions/Firestore collections.
3. Data Connect, PGAdapter/Cloud SQL, Spanner, and their generated clients.
4. Firebase Storage only after avatar/generated-media source objects reconcile.
5. Firebase Hosting only after Bunny deep-link/API-origin smoke and rollback pass.
6. Remaining callable/HTTP Functions only after every indexed and text-searched caller is on a target gateway.

Firebase Auth, its authorized domains, and its provider configuration remain.

- [ ] **Step 5: Verify GREEN and commit one provider boundary at a time**

For every boundary, run the repository's focused tests, full web/Functions/KMP gates that touch it, `verify:ownership`, provider-retirement verification, `git diff --check`, and full GitNexus detect-changes. A partial/truncated graph result blocks retirement.

```bash
git commit -m "chore: retire firestore state runtime"
git commit -m "chore: retire legacy relational runtimes"
git commit -m "chore: retire firebase storage delivery"
git commit -m "chore: retire firebase hosting delivery"
git commit -m "chore: retire migrated firebase functions"
```

Stage only the boundary named by each commit.

### Task 5: FIN-001 — Add measured unit-cost gates

**Files:**

- Create: `contracts/cost-budgets.json`
- Create: `scripts/finops/collect-usage.mjs`
- Create: `scripts/finops/calculate-unit-costs.mjs`
- Create: `scripts/finops/check-cost-budgets.mjs`
- Create: `scripts/test/cost-budgets.test.mjs`
- Create: `docs/operations/finops-runbook.md`
- Modify: `package.json`
- Modify: `.github/workflows/spresso-multi-agent-cicd.yml`

**Interfaces:**

- Produces daily/weekly metrics for active user, checkout attempt, completed order, AI text turn, AI media job, stored GiB, delivered GiB, and cache-hit ratio.
- Produces warning and hard-ceiling statuses without automatically upgrading plans or disabling customer data access.

- [ ] **Step 1: Write failing budget tests**

Fixtures cover zero traffic, missing usage dimensions, negative/counter-reset data, tier boundaries, regional multipliers, free-tier exhaustion, currency rounding, 50% warning, 80% alert, 100% hard ceiling, and a provider price update. The calculator must label estimates with their sample window and source timestamp.

- [ ] **Step 2: Run and verify RED**

Run `node --test scripts/test/cost-budgets.test.mjs`.

Expected: FAIL because budgets and calculators do not exist.

- [ ] **Step 3: Add explicit budget ownership**

`contracts/cost-budgets.json` names an owner, monthly ceiling, warning thresholds, effective date, and response per provider/category. Do not hard-code vendor prices in application code; keep versioned inputs in the contract and require review when pricing changes.

- [ ] **Step 4: Collect only provider aggregates**

Use provider usage/billing exports or APIs to collect aggregate counts/bytes/compute. Do not copy request payloads, prompts, images, credentials, tokens, or user PII into the cost dataset. Store raw daily aggregates and reproducible calculation outputs outside transactional application tables.

- [ ] **Step 5: Enforce practical controls**

- Convex: calls, read/write bytes, action compute, egress, AI provider calls, rate-limit rejections.
- Neon: active CU-hours, storage/history, egress, connection saturation, first-query latency.
- Bunny: storage bytes, delivered bytes by region, cache-hit ratio, origin bytes, Stream minutes only if used.
- Firebase: Auth MAU/SMS/TOTP-related usage and any remaining billable service.

At 80%, alert the owner and reduce optional AI/media concurrency through existing budget controls. At 100%, reject optional media generation with a clear user-safe error; do not block sign-in, account recovery, order lookup, or already-paid order processing.

- [ ] **Step 6: Establish baselines before alerting**

Run in report-only mode for two complete billing weeks or one complete monthly cycle, whichever arrives first. Populate budgets from observed p50/p95 usage plus an explicit growth allowance. Production samples, not the illustrative report numbers, become the alert baseline.

- [ ] **Step 7: Verify GREEN and commit**

```bash
node --test scripts/test/cost-budgets.test.mjs
node scripts/finops/calculate-unit-costs.mjs --fixture scripts/test/fixtures/cost-usage.json
node scripts/finops/check-cost-budgets.mjs --mode report-only
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
git add contracts/cost-budgets.json scripts/finops scripts/test/cost-budgets.test.mjs docs/operations/finops-runbook.md package.json .github/workflows/spresso-multi-agent-cicd.yml
git commit -m "feat: add measured platform cost gates"
```
