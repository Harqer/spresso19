# Convex Live State and AI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move reactive personal state, AI conversations, cost controls, and interaction aggregation from Firebase Functions/Firestore/Pub/Sub to Convex without adopting Convex Auth.

**Architecture:** Firebase ID tokens authenticate every Convex request. Convex tables own user-scoped live state and Agent threads; all queries are bounded and indexed by Firebase UID. Migration uses expand/backfill/contract, a final delta, and no permanent dual writes.

**Tech Stack:** Convex, Firebase Auth custom JWT, `@convex-dev/agent`, `@convex-dev/migrations`, `@convex-dev/rate-limiter`, `convex-test`, TypeScript, Kotlin Multiplatform.

**Spec:** `docs/superpowers/specs/2026-09-05-platform-cost-migration-design.md`

## Global Constraints

- REQUIRED SKILLS: `convex-expert` before ANY code under `convex/` (current object-form function syntax, import table, resource limits); `convex-migrate` and `convex-migrate-rehearse` before schema/data work on deployed data; `convex-test` for test generation; `convex-agent` for the AI task; `convex-crons` for scheduled jobs. Run `npx convex ai-files install` and read `convex/_generated/ai/guidelines.md` first — those guidelines override remembered API shapes.
- REQUIRED MIGRATION SUB-SKILLS: read and apply `convex-migrate` and `convex-migrate-rehearse` before schema/data work.
- For a schema change against existing Convex rows, create the rehearsal deployment from pre-change code, seed a read-only `npx convex export` snapshot before editing `schema.ts`, then use optional field -> bounded `@convex-dev/migrations` backfill -> count/shape verification -> required field. Never tighten first.
- A preview rehearsal requires a paid-tier Preview Deploy Key in `CONVEX_DEPLOY_KEY`; a normal CLI login is insufficient. If no preview key exists, use the personal development deployment, state that the paid preview gate was unavailable, and do not promote production.
- Production promotion requires fresh owner approval. Keep the sensitive export outside Git, keep the write window short, and state that `convex import --replace --prod` rollback loses writes made after the snapshot.
- Firebase UID is the subject; do not add Convex Auth.
- Every user-scoped query/mutation derives UID from `ctx.auth.getUserIdentity()` and uses an index. Never accept a caller-supplied UID.
- No `.collect()` on unbounded production tables and no OLAP scans.
- No permanent dual writes. Use optional fields, resumable backfill, validation, final delta, cutover, then contract.
- Do not store media bytes, relational commerce ledgers, raw telemetry, or unlimited AI context in Convex.
- Run GitNexus impact before symbol edits and full detect-changes before each commit.
- Write failing tests first.

---

### Task 1: CVX-001 — Bootstrap Firebase-authenticated Convex

**Files:**

- Create: `convex/auth.config.ts`
- Create: `convex/schema.ts`
- Create: `convex/convex.config.ts`
- Create: `convex/lib/identity.ts`
- Create: `convex/identity.test.ts`
- Modify: `package.json`
- Modify: `src/main.tsx`
- Modify: `composeApp/build.gradle.kts`

**Interfaces:**

- Produces: `requireFirebaseIdentity(ctx): Promise<{ firebaseUid: string }>`.
- Produces: authenticated Convex clients for web and KMP behind `BackendGateway`.

- [ ] **Step 1: Confirm current official setup without deploying**

Read the current Convex custom-JWT and client documentation. Verify the secure-token issuer, JWK URL, expected RS256 algorithm, and application ID for `get-spresso`. Do not create a remote deployment in this step.

- [ ] **Step 2: Write the failing identity tests**

Test these cases with `convex-test`, injecting identities via `t.withIdentity({ issuer, subject, tokenIdentifier })`: missing identity, anonymous identity, wrong issuer/audience, and a valid subject. The desired helper contract is:

```ts
export async function requireFirebaseIdentity(
  ctx: { auth: { getUserIdentity(): Promise<{ subject: string; issuer: string } | null> } },
): Promise<{ firebaseUid: string }>;
```

- [ ] **Step 3: Run and verify RED**

```bash
npx vitest run convex/identity.test.ts
```

Expected: FAIL because the helper and Convex test configuration do not exist.

- [ ] **Step 4: Add the minimal Convex/auth configuration**

Implemented (commit `185e4ab`) in the current official shape — `domain` must exactly match the JWT `iss` claim and `applicationID` the `aud` claim (Firebase ID tokens carry the project ID as audience). JWKS discovery is automatic through `{domain}/.well-known/openid-configuration`, verified live for `get-spresso` (RS256):

```ts
import type { AuthConfig } from "convex/server";

export default {
  providers: [{
    domain: "https://securetoken.google.com/get-spresso",
    applicationID: "get-spresso",
  }],
} satisfies AuthConfig;
```

A wrong value here silently leaves every `ctx.auth.getUserIdentity()` null — the identity test suite pins the exact strings. Spresso deliberately does NOT adopt `@convex-dev/auth` (the `convex-auth` skill's default): Firebase Auth remains the identity system of record.

Reject anonymous identities in privileged helpers. Keep ordinary browsing outside the privileged helper.

- [ ] **Step 5: Add client providers behind existing gateways**

Web and KMP token callbacks return the current Firebase ID token. Do not embed provider names in UI components. Preserve `FirebaseLegacyGateway` for rollback.

- [ ] **Step 6: Verify GREEN without production deploy**

```bash
npx vitest run convex/identity.test.ts
npx convex codegen
npm run lint
npm run build
env JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/bin:/bin ./gradlew :composeApp:testDebugUnitTest :composeApp:compileKotlinWasmJs --no-daemon
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 7: Commit**

```bash
git add convex package.json package-lock.json src/main.tsx composeApp/build.gradle.kts
git commit -m "feat: bootstrap convex with firebase identity"
```

### Task 2: CVX-002 — Define bounded reactive state and migrations

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/preferences.ts`
- Create: `convex/savedProducts.ts`
- Create: `convex/cart.ts`
- Create: `convex/wardrobe.ts`
- Create: `convex/migrations.ts`
- Create: `convex/reactiveState.test.ts`
- Create: `scripts/migrations/export-reactive-state.mjs`
- Create: `scripts/migrations/verify-reactive-state.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: `setPreference`, `toggleSavedProduct`, `addCartItem`, `setCartQuantity`, `removeCartItem`, `addWardrobeItem`, and `removeWardrobeItem`.
- Produces: indexed list queries bounded by authenticated UID and explicit pagination/limit.

- [ ] **Step 1: Run impact analysis**

```bash
node .gitnexus/run.cjs impact "useWardrobeState" --direction upstream --repo .
node .gitnexus/run.cjs query "cart saved products wardrobe preferences" --repo .
```

For UNKNOWN edges, confirm dynamic property and callable names with `rg` before planning a deletion.

- [ ] **Step 2: Write failing table and authorization tests**

Cover same-user reads, cross-user denial, idempotent toggle, O(1) wardrobe mutation, cart quantity validation, duplicate product prevention, pagination bound, and anonymous denial.

Use the desired schema keys:

```ts
preferences.index("by_user", ["firebaseUid"]);
savedProducts.index("by_user_product", ["firebaseUid", "productId"]);
cartItems.index("by_user_product", ["firebaseUid", "productId"]);
wardrobeItems.index("by_user_updated", ["firebaseUid", "updatedAt"]);
```

- [ ] **Step 3: Run and verify RED**

Run `npx vitest run convex/reactiveState.test.ts`.

Expected: FAIL because tables/functions are absent.

- [ ] **Step 4: Add the expand schema and minimal functions**

Each table stores one membership/item, not an array document. Mutations query the compound unique key before insert/update. List queries use `.withIndex(...)`, `.order("desc")`, and `.take(limit)` with a maximum limit of 100.

- [ ] **Step 5: Add resumable migration definitions**

Use `@convex-dev/migrations`. Each migration accepts optional old fields, writes at most a bounded batch, records cursor/status, and exposes counts for `source`, `target`, `invalid`, and `remaining`.

```ts
export const backfillWardrobeOwnership = migrations.define({
  table: "wardrobeItems",
  migrateOne: async (_ctx, item) =>
    item.updatedAt === undefined ? { updatedAt: item._creationTime } : undefined,
});
```

For every later change to a populated Convex table: export the source read-only; create `migrate-<slug>` from pre-change code; import the snapshot with `--deployment migrate-<slug>`; push the optional schema to that same preview with `--preview-name`; run the bounded backfill and verify; then push the tightened validator. Never use `convex dev` as a substitute for targeting the named preview.

- [ ] **Step 6: Build export/import verification**

`export-reactive-state.mjs` writes newline-delimited canonical records. `verify-reactive-state.mjs` sorts by domain key and reports counts, SHA-256 hashes, invalid rows, and duplicate keys. It exits nonzero unless counts/hashes match and invalid/duplicate counts are zero.

- [ ] **Step 7: Verify GREEN**

```bash
npx vitest run convex/reactiveState.test.ts
npx convex codegen
node scripts/migrations/verify-reactive-state.mjs --help
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 8: Commit**

```bash
git add convex scripts/migrations package.json package-lock.json
git commit -m "feat: add bounded convex reactive state"
```

### Task 3: CVX-002 — Switch personal-state adapters by domain

**Files:**

- Modify: `src/hooks/useWardrobeState.ts`
- Modify: `src/App.tsx`
- Modify: `src/lib/cartState.ts`
- Modify: `src/components/GamifiedOnboardingModal.tsx`
- Modify: `src/services/backend/ConvexGateway.ts`
- Modify: `composeApp/src/commonMain/kotlin/network/BackendGateway.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Create: `test/reactiveStateCutover.test.ts`
- Create: `composeApp/src/commonTest/kotlin/network/ReactiveStateCutoverTest.kt`
- Create: `contracts/domain-cutovers.json`

**Interfaces:**

- Consumes: Task 2 Convex functions.
- Produces: per-domain `legacy | target` read/write switches and a reconciliation record.

- [ ] **Step 1: Analyze each caller before editing**

Run GitNexus impact for each hook/client method. Report HIGH/CRITICAL results. Confirm UNKNOWN dynamic callable names with text search.

- [ ] **Step 2: Write failing adapter/cutover tests**

For each domain, assert `legacy` reads/writes use only `FirebaseLegacyGateway` and `target` reads/writes use only `ConvexGateway`. Assert the configuration rejects mixed read/write ownership after the final-delta state.

- [ ] **Step 3: Verify RED**

```bash
npx tsx --test test/reactiveStateCutover.test.ts
```

Expected: FAIL because `ConvexGateway` and cutover contract do not exist.

- [ ] **Step 4: Implement adapters without dual-write permanence**

Use the state machine `legacy -> shadow-read-verify -> target-read -> legacy-write-freeze -> final-delta -> target`. Shadow reads emit reconciliation telemetry but never choose whichever response arrives first.

- [ ] **Step 5: Rehearse each initial cross-provider domain import**

On an isolated preview deployment when a Preview Deploy Key is available, otherwise on the personal development deployment, export/import preferences first, then saved products, wardrobe, and cart. This is an initial Firebase-to-Convex load, so the rollback source is the canonical source export rather than a pre-change Convex snapshot. For each domain: run count/hash validation, force one invalid-row fixture, verify the rehearsal fails, fix the fixture, and rerun to zero invalid rows. Any subsequent schema change on populated Convex data must use the pre-change Convex snapshot workflow in the global constraints.

- [ ] **Step 6: Replace the wardrobe full-array rewrite**

Remove the effect-level `setDoc` path in `useWardrobeState.ts`. Call granular gateway mutations. Preserve optimistic UI and roll back only the affected item on a rejected mutation.

- [ ] **Step 7: Verify GREEN**

Run the focused web/KMP tests, full TypeScript build, KMP unit/Wasm compile, and the migration verification command. Record p50/p95 for each operation before and after.

- [ ] **Step 8: Commit each domain separately**

```bash
git commit -m "feat: migrate preferences to convex"
git commit -m "feat: migrate saved products to convex"
git commit -m "feat: migrate wardrobe to convex"
git commit -m "feat: migrate cart to convex"
```

Stage only the files for the named domain before each commit.

### Task 4: AI-001 — Move conversation state and spend controls to Convex Agent

**Files:**

- Create: `convex/agents.ts`
- Create: `convex/ai/chat.ts`
- Create: `convex/ai/usage.ts`
- Create: `convex/ai/cache.ts`
- Create: `convex/ai/jobs.ts`
- Create: `convex/ai/agent.test.ts`
- Modify: `functions/src/ai/index.ts`
- Modify: `functions/src/ai/costControls.ts`
- Modify: `src/components/GenkitCreativeStudioModal.tsx`
- Modify: `src/components/VirtualTryOnModal.tsx`
- Modify: `src/components/features/catalog/Product360SpinModal.tsx`
- Modify: `src/components/features/catalog/ProductCatalogPage.tsx`
- Modify: `src/components/features/chat/CreatorGenAIAgentsChatPage.tsx`
- Modify: `src/components/features/chat/PersonalAIShopperChatPage.tsx`
- Modify: `src/hooks/useWardrobeInteractions.ts`
- Modify: `composeApp/src/androidMain/kotlin/com/spresso/SpressoGlimmerActivity.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobeViewPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/FirebaseRoutes.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/GenerativeAiService.kt`
- Modify: `composeApp/src/commonMain/kotlin/viewmodels/ChatViewModel.kt`

**Interfaces:**

- Produces: `createThread`, `sendMessage`, `streamMessage`, `getThreadMessages`, `startAiJob`, and `getAiJob`.
- Produces: `rawUsage` records keyed by billing period, Firebase UID, provider, model, feature, and request ID.

- [ ] **Step 1: Analyze the current AI flows**

```bash
node .gitnexus/run.cjs query "AI chat streaming cache budget PubSub job" --repo .
node .gitnexus/run.cjs context "chatStream" --repo .
node .gitnexus/run.cjs context "withCache" --repo .
```

- [ ] **Step 2: Write failing Agent/cost tests**

Cover authenticated thread ownership, cross-user denial, bounded history, older-turn summarization, per-user rate rejection, global daily dollar ceiling, raw usage attribution, provider failure, and N concurrent identical cache misses producing one tool/provider call.

- [ ] **Step 3: Verify RED**

Run `npx vitest run convex/ai/agent.test.ts` and confirm missing Agent configuration/functions.

- [ ] **Step 4: Configure Agent and rate limiter**

Define the Spresso shopper agent with existing provider tools. Persist threads/messages through `@convex-dev/agent`; do not expose model/provider names in customer copy. Configure per-user message/token limits and global provider-dollar ceilings.

- [ ] **Step 5: Implement bounded context and usage**

Keep the newest bounded message window, summarize older messages, and store the summary as thread context. A usage handler records input/output/total tokens plus provider/model/feature/request ID. Reject before provider invocation when a hard ceiling is exceeded.

- [ ] **Step 6: Implement single-flight cache**

Use a canonical input hash and states `pending | ready | failed`, an owner request ID, lease expiry, result metadata, and TTL. A concurrent caller waits/subscribes to the existing producer instead of invoking the provider.

- [ ] **Step 7: Move callers, then remove legacy AI state**

Switch new threads first. Import only explicitly retained conversations. After the observation window, delete Firestore `aiCache`/budget/conversation paths and the matching Functions exports. Keep provider tool/action boundaries.

- [ ] **Step 8: Verify GREEN and load behavior**

Run Agent tests, a 20-concurrent-request single-flight test, TypeScript build, and streaming smoke test. Assert customer UI contains no internal provider, database, token, or workflow copy.

- [ ] **Step 9: Commit**

```bash
git add convex/agents.ts convex/ai functions/src/ai src composeApp package.json package-lock.json
git commit -m "feat: move ai conversations and cost controls to convex"
```

### Task 5: OBS-001 — Delete no-op Pub/Sub and batch interactions

**Files:**

- Create: `convex/interactions.ts`
- Create: `convex/interactions.test.ts`
- Modify: `functions/src/ai/index.ts`
- Modify: `functions/src/interactions.ts`
- Modify: `src/components/features/chat/PersonalAIShopperChatPage.tsx`
- Modify: `src/hooks/useWardrobeGalleryInteractions.ts`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/FirebaseRoutes.kt`
- Modify: `functions/package.json`

**Interfaces:**

- Produces: `ingestInteractions(events: InteractionEvent[1..50])` and a bounded daily aggregation job.

- [ ] **Step 1: Run impact analysis**

Analyze `logSearchHistory`, `processSearchHistoryTelemetry`, and interaction-callable symbols. Confirm dynamic route strings by text search.

- [ ] **Step 2: Write failing tests**

Assert 1–50 event validation, cross-user UID override rejection, deduplication by event ID, bounded payload size, daily aggregate output, and batch-size-20 reducing 100 event calls from 100 to 5.

- [ ] **Step 3: Verify RED**

Run `npx vitest run convex/interactions.test.ts`.

- [ ] **Step 4: Implement bounded ingestion and local queues**

Clients queue privacy-safe low-value interaction events, flush at 20 events or lifecycle transition, cap the local queue, and discard oldest low-value events only when full. Checkout, payment, authentication, and recovery events remain synchronous and unbatched.

- [ ] **Step 5: Delete no-op Pub/Sub paths**

After target tests and caller cutover, delete `logSearchHistory` and its subscriber. Remove `@google-cloud/pubsub` only after every remaining queue use, including VTO, has a replacement.

- [ ] **Step 6: Verify GREEN**

Run focused interaction tests, Functions build/tests, web build, KMP tests, `rg` for removed export names, `git diff --check`, and GitNexus detect-changes.

- [ ] **Step 7: Commit**

```bash
git add convex/interactions.ts convex/interactions.test.ts functions/src/ai/index.ts functions/src/interactions.ts functions/package.json functions/package-lock.json src composeApp
git commit -m "feat: batch interactions and remove no-op pubsub"
```
