# Cost Guardrails and Backend Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent dormant fixed-cost Google infrastructure and Firestore logging spend, then place provider-specific transports behind typed domain contracts.

**Architecture:** A machine-readable ownership manifest defines the sole owner for every data class. CI rejects forbidden fixed-cost resources and duplicate owners. Web and KMP clients obtain Firebase identity through a token provider and invoke typed domain gateways; legacy Firebase adapters remain only as short-lived rollback paths.

**Tech Stack:** TypeScript, Kotlin Multiplatform, Firebase Auth, Node test runner, Terraform, GitNexus.

**Spec:** `docs/superpowers/specs/2026-09-05-platform-cost-migration-design.md`

## Global Constraints

- Preserve Firebase Auth and Firebase UID.
- This plan does not deploy, destroy, or change billing for any remote service.
- Do not remove Terraform resources until an approved read-only state inventory proves whether they exist.
- Do not introduce a generic stringly typed RPC wrapper.
- Run GitNexus impact before symbol edits and full detect-changes before each commit.
- Use test-first changes and preserve a selectable legacy gateway until its domain cutover completes.

---

### Task 1: ARCH-001 — Make backend ownership executable

**Files:**

- Create: `contracts/backend-ownership.json`
- Create: `scripts/verify-backend-ownership.mjs`
- Create: `scripts/test/backend-ownership.test.mjs`
- Modify: `AGENTS.md`
- Modify: `docs/spresso_architecture_context.md`
- Modify: `package.json`

**Interfaces:**

- Produces: `contracts/backend-ownership.json` with `domain`, `owner`, `status`, `allowedClients`, and `legacyOwners`.
- Produces: `node scripts/verify-backend-ownership.mjs` returning exit 0 only for the approved ownership map.

- [ ] **Step 1: Record pre-edit impact**

Run:

```bash
node .gitnexus/run.cjs query "backend ownership infrastructure configuration" --repo .
node .gitnexus/run.cjs context "logToCrashlytics" --repo .
```

Expected: repository `Spresso19` at the current HEAD. No production symbol is edited in this task; retain the `callFirebaseFunction` HIGH-risk warning for Task 4.

- [ ] **Step 2: Write the failing ownership tests**

Create `scripts/test/backend-ownership.test.mjs` with assertions equivalent to:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("each domain has exactly one active authoritative owner", async () => {
  const contract = JSON.parse(await readFile("contracts/backend-ownership.json", "utf8"));
  for (const domain of contract.domains) {
    assert.equal(domain.owner.length > 0, true, `${domain.domain} has no owner`);
    assert.equal(Array.isArray(domain.owner), false, `${domain.domain} has multiple owners`);
  }
});

test("identity remains Firebase Auth and media belongs to Bunny", async () => {
  const contract = JSON.parse(await readFile("contracts/backend-ownership.json", "utf8"));
  const byName = Object.fromEntries(contract.domains.map((item) => [item.domain, item.owner]));
  assert.equal(byName.identity, "firebase-auth");
  assert.equal(byName.reactive-state, "convex");
  assert.equal(byName.commerce-ledger, "neon");
  assert.equal(byName.media-bytes, "bunny");
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
node --test scripts/test/backend-ownership.test.mjs
```

Expected: FAIL because `contracts/backend-ownership.json` does not exist.

- [ ] **Step 4: Add the minimal ownership contract**

Create the manifest with these active owners:

```json
{
  "version": 1,
  "domains": [
    {"domain":"identity","owner":"firebase-auth","status":"active","allowedClients":["web","android","wasm"],"legacyOwners":[]},
    {"domain":"passkey-security","owner":"neon","compute":"convex-action","status":"planned","allowedClients":["trusted-server"],"legacyOwners":["firestore-build-artifact","dataconnect-generated"]},
    {"domain":"reactive-state","owner":"convex","status":"planned","allowedClients":["typed-gateway"],"legacyOwners":["firestore","dataconnect"]},
    {"domain":"ai-state","owner":"convex","status":"planned","allowedClients":["typed-gateway"],"legacyOwners":["firestore","pubsub"]},
    {"domain":"commerce-ledger","owner":"neon","status":"planned","allowedClients":["trusted-server"],"legacyOwners":["firestore","dataconnect","pgadapter","spanner"]},
    {"domain":"media-bytes","owner":"bunny","status":"planned","allowedClients":["signed-upload","signed-read"],"legacyOwners":["firebase-storage"]}
  ]
}
```

- [ ] **Step 5: Implement the ownership verifier and update architecture rules**

Make the verifier reject duplicate domain names, array-valued owners, or client access to Neon/Bunny secrets. Fixed-cost Terraform source is deliberately handled by Task 2 so this task can finish green against the current tree.

Update `AGENTS.md` and `docs/spresso_architecture_context.md` so they no longer mandate Firestore-first state, Firestore `/logs`, Spanner, or always-warm Cloud Run. State the approved Firebase/Convex/Neon/Bunny ownership map and link the design spec instead of duplicating it.

Add scripts:

```json
{
  "verify:ownership": "node scripts/verify-backend-ownership.mjs",
  "test:ownership": "node --test scripts/test/backend-ownership.test.mjs"
}
```

- [ ] **Step 6: Verify GREEN and regression gates**

Run:

```bash
npm run test:ownership
npm run verify:ownership
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

Expected: all commands pass; detect-changes reports documentation/config scope and no unexpected symbol risk.

- [ ] **Step 7: Commit**

```bash
git add AGENTS.md docs/spresso_architecture_context.md contracts/backend-ownership.json scripts/verify-backend-ownership.mjs scripts/test/backend-ownership.test.mjs package.json
git commit -m "docs: enforce backend ownership boundaries"
```

### Task 2: ARCH-001 — Neutralize dormant Terraform safely

**Files:**

- Create: `terraform/README.md`
- Create: `scripts/test/no-fixed-google-runtime.test.mjs`
- Modify or delete after state proof: `terraform/main.tf`
- Modify or delete after state proof: `terraform/outputs.tf`
- Modify or delete after state proof: `terraform/variables.tf`
- Modify: `package.json`

**Interfaces:**

- Consumes: the forbidden-resource rules from `contracts/backend-ownership.json`.
- Produces: a source tree that cannot plan Spanner, VPC connector, or always-warm Cloud Run by default.

- [ ] **Step 1: Write the failing source guard**

Create a Node test that recursively reads tracked `.tf` files and rejects active `google_spanner_instance`, `google_vpc_access_connector`, `google_service_networking_connection`, and `min_instance_count` above zero.

```js
assert.doesNotMatch(terraformSource, /resource\s+"google_spanner_instance"/);
assert.doesNotMatch(terraformSource, /resource\s+"google_vpc_access_connector"/);
assert.doesNotMatch(terraformSource, /min_instance_count\s*=\s*[1-9]/);
```

- [ ] **Step 2: Run the test and verify RED**

Run `node --test scripts/test/no-fixed-google-runtime.test.mjs`.

Expected: FAIL on the current Spanner, connector, and warm-service declarations.

- [ ] **Step 3: Validate source, then stop for the remote-state gate**

First validate source without contacting a backend:

```bash
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
```

With separate owner approval and the documented backend credentials, initialize the real backend in an isolated Terraform data directory and run only `state list` and `plan -refresh-only`; do not apply. Do not treat an empty local state created by `-backend=false` as remote-state proof. If any target exists remotely, create a separate decommission ticket and require an approved backup/destroy plan. If no target exists, continue.

- [ ] **Step 4: Remove dormant resource declarations**

Delete the fixed-cost Spanner/VPC/Cloud Run/Storage resource graph and obsolete outputs/variables. Keep `terraform/README.md` with the verified state result, the approved providers, and the rule that future paid resources require a cost record.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
node --test scripts/test/no-fixed-google-runtime.test.mjs
terraform -chdir=terraform fmt -check
terraform -chdir=terraform validate
npm run verify:ownership
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 6: Commit**

```bash
git add terraform scripts/test/no-fixed-google-runtime.test.mjs package.json
git commit -m "chore: neutralize dormant fixed-cost google runtime"
```

### Task 3: COST-001 — Remove Firestore as a client log sink

**Files:**

- Create: `scripts/test/no-firestore-logging.test.mjs`
- Modify: `src/lib/firebase.ts:109`
- Modify: `src/lib/Logger.ts:38`
- Modify: `functions/src/users.ts`
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `package.json`

**Interfaces:**

- Produces: existing logger methods with unchanged caller signatures and no Firestore writes.
- Preserves: console/error telemetry, release/correlation context, and PII redaction.

- [ ] **Step 1: Run impact analysis**

```bash
node .gitnexus/run.cjs impact "logToCrashlytics" --direction upstream --repo .
node .gitnexus/run.cjs context "Logger" --repo .
```

Expected: many upstream web call sites. Preserve public signatures; only replace the sink.

- [ ] **Step 2: Write the failing static and behavior guards**

The static guard reads `src/lib/firebase.ts` and `src/lib/Logger.ts` and rejects `addDoc`, `collection(db, "logs")`, and `collection(db,'logs')`. Add a focused logger behavior test that captures `console.error` and asserts redacted structured output for an `Error` without calling Firebase.

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test scripts/test/no-firestore-logging.test.mjs
```

Expected: FAIL on the current `logs` collection writes.

- [ ] **Step 4: Remove only the Firestore sink**

Keep current exported logging function names. Emit browser console output only in development and the configured error sink for sampled production errors. Retain `route`, `release`, and `correlationId`; redact tokens, email addresses, request bodies, signed URLs, and image bytes.

Remove `logs` collection cleanup from account deletion and remove rules/index entries only after confirming there are no documents.

- [ ] **Step 5: Verify GREEN**

```bash
node --test scripts/test/no-firestore-logging.test.mjs
npm run lint
npm run build
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase.ts src/lib/Logger.ts functions/src/users.ts firestore.rules firestore.indexes.json scripts/test/no-firestore-logging.test.mjs package.json
git commit -m "fix: remove firestore client logging"
```

### Task 4: ARCH-002 — Add typed web and KMP backend contracts

**Files:**

- Create: `src/services/backend/contracts.ts`
- Create: `src/services/backend/AuthTokenProvider.ts`
- Create: `src/services/backend/FirebaseLegacyGateway.ts`
- Create: `src/services/backend/index.ts`
- Create: `test/backendGateway.test.ts`
- Create: `composeApp/src/commonMain/kotlin/network/BackendGateway.kt`
- Create: `composeApp/src/commonMain/kotlin/network/AuthTokenProvider.kt`
- Create: `composeApp/src/commonTest/kotlin/network/BackendGatewayContractTest.kt`
- Modify: `src/lib/firebase.ts`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`

**Interfaces:**

- Produces web contracts:

```ts
export interface AuthTokenProvider {
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
}

export interface ReactiveStateGateway {
  setPreference(input: SetPreferenceInput): Promise<void>;
  toggleSavedProduct(input: ToggleSavedProductInput): Promise<SavedProduct>;
}

export interface CommerceGateway {
  prepareCheckout(input: PrepareCheckoutInput): Promise<PreparedCheckout>;
  getOrder(orderId: string): Promise<OrderView | null>;
}

export interface PasskeyGateway {
  createRegistrationOptions(): Promise<RegistrationOptions>;
  verifyRegistration(responseJson: string): Promise<PasskeySummary>;
  createAssertionOptions(input: StepUpRequest): Promise<AssertionOptions>;
  verifyAssertion(input: VerifyAssertionInput): Promise<StepUpGrant>;
}

export interface MediaGateway {
  createUpload(input: CreateUploadInput): Promise<UploadAuthorization>;
}
```

- Produces equivalent suspend-function KMP interfaces with typed sealed results.

- [ ] **Step 1: Run blast-radius analysis and report HIGH risk**

```bash
node .gitnexus/run.cjs impact "callFirebaseFunction" --direction upstream --repo .
node .gitnexus/run.cjs context "ApiClient" --repo .
```

Expected: `callFirebaseFunction` is HIGH risk with five direct callers and three indexed flows. Do not bulk-replace names. Introduce adapters first.

- [ ] **Step 2: Write failing contract tests**

Create TypeScript and KMP tests that instantiate a recording gateway, invoke one preference call and one checkout call, and assert the exact typed input. Add a static assertion that UI/component files do not import `firebase/functions` or generated Data Connect clients after their domain migrates.

- [ ] **Step 3: Run tests and verify RED**

```bash
npx tsx --test test/backendGateway.test.ts
env JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/bin:/bin ./gradlew :composeApp:testDebugUnitTest --no-daemon
```

Expected: FAIL because the contracts do not exist.

- [ ] **Step 4: Add contracts and legacy adapters**

Implement only typed method forwarding in `FirebaseLegacyGateway`; do not change domain behavior. Inject `AuthTokenProvider` separately so Firebase identity is not coupled to Firebase transport. Use sealed KMP results: `Success`, `Empty`, `Unavailable`, `Unauthorized`, `ValidationError`, and `ProviderError`.

- [ ] **Step 5: Move one low-risk caller as a proof**

Choose a caller whose GitNexus impact is LOW and exact. Replace its direct callable invocation with the injected legacy gateway without changing the endpoint or result. Do not touch a HIGH/UNKNOWN caller until it has its own domain migration ticket.

- [ ] **Step 6: Verify GREEN**

```bash
npx tsx --test test/backendGateway.test.ts
npm run lint
env JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/bin:/bin ./gradlew :composeApp:testDebugUnitTest :composeApp:compileKotlinWasmJs --no-daemon
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 7: Commit**

```bash
git add src/services/backend src/lib/firebase.ts test/backendGateway.test.ts composeApp/src/commonMain/kotlin/network composeApp/src/commonTest/kotlin/network
git commit -m "refactor: add typed backend gateway contracts"
```

### Task 5: Add Wave 0 CI gates

**Files:**

- Create: `scripts/test/ci-architecture-gates.test.mjs`
- Modify: `.github/workflows/spresso-multi-agent-cicd.yml`
- Modify: `docs/testing.md`

**Interfaces:**

- Consumes: `test:ownership`, `verify:ownership`, no-fixed-runtime, no-Firestore-logging, web gateway, and KMP gateway checks.
- Produces: one required `architecture-guardrails` CI job.

- [ ] **Step 1: Write a failing workflow contract test**

Add a Node test that parses the active workflow text and requires commands for all Wave 0 gates.

- [ ] **Step 2: Verify RED**

Run `node --test scripts/test/ci-architecture-gates.test.mjs` and confirm the job is absent.

- [ ] **Step 3: Add the CI job and testing documentation**

Run Node 22 and JDK 17. The job executes ownership, fixed-runtime, Firestore-log, TypeScript, and KMP contract tests. It must not require cloud credentials.

- [ ] **Step 4: Verify GREEN**

```bash
node --test scripts/test/ci-architecture-gates.test.mjs scripts/test/backend-ownership.test.mjs scripts/test/no-fixed-google-runtime.test.mjs scripts/test/no-firestore-logging.test.mjs
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows docs/testing.md scripts/test/ci-architecture-gates.test.mjs
git commit -m "ci: enforce architecture cost guardrails"
```
