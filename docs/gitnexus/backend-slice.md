# GitNexus backend slice inventory

Date: 2026-09-04  
Scope: `functions/**`, Firebase configuration, Firestore/Storage rules, and
backend documentation. This is an inventory only; no production behavior was
changed.

## Boundary and ownership

| Area | Current source of truth | Generated or adjacent material | Verification owner |
| --- | --- | --- | --- |
| Firebase Functions entrypoint | `functions/src/index.ts` and its re-exported modules | `functions/lib/index.js`, source maps | `npm run build`; deployed exports inspection |
| AI/Genkit | `functions/src/ai/**` | `functions/lib/ai/**` | `npm run genkit:verify`; flow contract tests |
| Stripe checkout | `functions/src/webhooks.ts` (`prepareCheckout`, signed `stripeWebhook`) | `functions/lib/webhooks.js` | quote/idempotency/webhook tests and Stripe integration test |
| Wallet/crypto boundary | `functions/src/payments/**` (`prepareAgentTransfer`, `confirmAgentTransfer`) | `functions/lib/payments/**`; stale AI crypto JS noted below | wallet policy tests and provider integration test |
| Cart/orders | `functions/src/cart/**`, `functions/src/orders/**` | matching `functions/lib/**` | cart quote and order state tests |
| Discovery | `functions/src/catalog.ts`, `functions/src/ai/providers/**`, `functions/src/contracts/**` | matching compiled JS | provider normalization and merchant-quote tests |
| Firebase routing/rules | `firebase.json`, `firestore.rules`, `storage.rules`, indexes | none | Firebase CLI config/rules validation |

The application is discovery and merchant-routing, not an inventory system.
The stale `/api/inventory` hosting-cache rule has been removed from
`firebase.json`. There is no corresponding inventory function in the current
source export list; the single `/api/**` rewrite to `webApi` remains the
canonical API boundary. Do not add stock, reservation, or inventory fields to
close this mismatch.

The focused configuration contract is
`scripts/test/firebase-config.test.mjs`. It asserts both the canonical API
rewrite and the absence of an inventory-specific cache policy. The test passes
locally with `node --test scripts/test/firebase-config.test.mjs`. A Firebase
CLI dry-run could not be completed in this environment because fetching
`firebase-tools@latest` did not return; no deployment conclusion is drawn from
that timeout.

## Source versus generated files

`functions/tsconfig.json` compiles `functions/src` to `functions/lib` and the
package build additionally copies `src/dataconnect` into `lib`. The repository
currently tracks 47 source files and 69 files under `functions/lib`; the
working tree has both modified tracked output and untracked compiled output.
The generated tree includes JavaScript and source maps, and also contains
artifacts with no current TypeScript source counterpart:

- `functions/lib/ai/tools/payWithCrypto.js` and its map
- `functions/lib/ai/tools/prepareCryptoPurchase.js` and its map
- `functions/lib/payments/cryptoPolicy.js` and its map
- `functions/lib/shared/passkeys.js` and its map
- `functions/lib/src/**` duplicate compiled paths
- `functions/lib/dataconnect/**` copied/generated connector output

`functions/src/ai/tools/prepareCryptoPurchase.ts` is deleted in the current
working tree and its compiled JavaScript has been archived with the other
orphan outputs. This is a provenance mismatch, not evidence that the generated
tool should be restored. Rebuild `functions/lib` from source; do not hand-edit
or selectively restore generated files.

## Payment and agentic safety observations

- `prepareCheckout` obtains a fresh merchant quote before creating a Stripe
  PaymentIntent and `stripeWebhook` is the order reconciliation boundary.
- The older `createStripeIntent`, `confirmPurchase`, `executeBiometricPurchase`,
  and `processCryptoPayment` exports intentionally reject client-controlled or
  merchant-site payment requests. They must not be revived as alternate
  processors without a reviewed payment design and provider documentation.
- Wallet transfer preparation and execution are separate callables. Execution
  requires an explicit confirmation token and is policy-limited to configured
  stablecoin networks. This is a wallet transfer boundary, not proof that
  merchant checkout can be paid with crypto.
- `functions/package.json` includes Coinbase AgentKit/CDP SDK, Stripe, Genkit,
  direct Gemini, Spanner, and legacy PostgreSQL/Data Connect dependencies. Each
  runtime needs an explicit owner; dependency presence is not deployment or
  provider-readiness evidence.

## GitNexus evidence

The current index resolves `prepareCheckout` in
`functions/src/webhooks.ts`, but upstream impact returns `UNKNOWN` with zero
callers. Per GitNexus guidance, this must be confirmed with text search before
editing; the symbol is also re-exported by `functions/src/index.ts` and
referenced by generated output. Treat checkout as critical regardless of the
empty edge set.

The query `payment checkout webhook agent wallet` returned wallet preparation
and confirmation processes plus source and generated payment symbols. It also
exposed the stale generated crypto tools listed above. The index warns about
cross-language property sites and truncated process output, so a zero or small
caller set is not an all-clear.

## Isolated parallel commits

Run these as separate workstreams, each with an upstream impact check before
editing existing symbols and a `detect-changes --scope compare --base-ref main`
check after the workstream:

1. **Firebase configuration and rules** — remove the stale inventory cache
   route only after verifying Hosting rewrites, Functions exports, and API
   callers; validate rules and run a Firebase dry-run/deployment inspection.
2. **Stripe checkout** — keep merchant quote freshness, explicit user
   confirmation, Stripe idempotency, signed webhook verification, and order
   reconciliation in one slice. Add non-networked quote/webhook tests and an
   explicit provider integration test.
3. **Coinbase/wallet boundary** — separate merchant crypto checkout from agent
   wallet transfers; verify the current Coinbase SDK surface, secrets, network
   policy, replay/idempotency state, and confirmation UX before changing code.
4. **Genkit/AI discovery** — read the Genkit skill and current docs first;
   validate tool schemas, authenticated context, provider provenance, cost
   controls, and streaming behavior. Run `npm run genkit:verify` plus contract
   tests.
5. **Generated-output normalization** — after source slices are stable, rebuild
   once, compare `src` to `lib`, and establish a single tracked/generated-file
   policy. This must be last so stale output does not mask source changes.

Recommended backend verification commands:

```bash
cd functions && npm run build
cd functions && npm test
cd functions && npm run genkit:verify
firebase firestore:rules:test
firebase deploy --only functions --dry-run
```

The last two commands require an authenticated Firebase CLI and should be run
against the verified `get-spresso` project. No commit or cleanup was performed
because the shared worktree and Git metadata are owned by the parent workflow.
