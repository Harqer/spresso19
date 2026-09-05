# Firebase Auth and Google AI Production Audit

Audit date: 24 August 2026  
Cloud project: `get-spresso` (`426485634252`)  
Product and Play listing name: **Spresso**

## Executive result

Firebase Authentication is initialized and usable for Google, email/password and anonymous sign-in. The refreshed Android config includes the web OAuth client and the local debug signing certificate. Local remediation now issues one-use, model-constrained Gemini Live tokens through `/v1beta/auth_tokens`, rejects malformed token responses, and rejects missing or invalid Firebase ID tokens before `chatStream` invokes a model. The backend AI stack is still not deployable or production-ready: required cloud APIs and Secret Manager are disabled, several Genkit paths use retired models or unbound secrets, Android and wearable Live clients still need protocol migration, and the Python Chef agent is not implemented as a discoverable Google ADK application.

## Firebase Authentication state

| Area | Verified state | Release impact |
| --- | --- | --- |
| Firebase project | CLI confirms `get-spresso`; Hosting origin is `https://get-spresso.web.app` | Correct environment |
| Providers | Google, email/password and anonymous are enabled | Core sign-in methods provisioned |
| Authorized domains | `get-spresso.firebaseapp.com`, `get-spresso.web.app` | Production domains are present; localhost is intentionally absent |
| Android OAuth | Debug SHA-1/SHA-256 registered; refreshed `google-services.json` contains Android and web OAuth clients | Debug Google sign-in can be configured; release signing fingerprint is still missing |
| Anonymous accounts | Auto-delete is enabled | Appropriate for temporary users, but account-linking behavior needs tests |
| Email privacy | Improved email privacy is enabled | Reduces account-enumeration exposure |
| Phone sign-in | Disabled | Existing phone buttons must remain unavailable until SMS policy is configured |
| MFA | Disabled | Product/security decision required before claiming MFA support |
| App Check | API disabled | Every callable configured with `enforceAppCheck` will fail until App Check is provisioned; web builds also require `VITE_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` |
| OAuth secret | Rotation required | An administrative response exposed the generated secret in local command output; rotate it in Google Auth Platform and refresh the Firebase Google provider |

### Authentication code gaps

1. The web email form automatically creates an account after an `invalid-credential` response. With improved email privacy this can turn a mistyped password into a confusing registration attempt. Sign-in and sign-up should be explicit user intents.
2. No production password-reset flow or `sendEmailVerification` call was found. Functions that depend on verified email must not infer verification from successful password authentication.
3. Phone authentication UI exists on Android and web while the provider is disabled. It also lacks an approved SMS region allowlist, Play Integrity/reCAPTCHA SMS defense evidence, quota/alerting and toll-fraud tests.
4. The release keystore and Play App Signing certificate are absent locally, so the release SHA fingerprints cannot be registered yet. Add both Play App Signing SHA-1/SHA-256 values before release Google sign-in testing.
5. Callable and HTTPS client tests must cover Firebase callable envelopes, ID-token refresh, App Check tokens, revoked users, provider linking, anonymous upgrade and account deletion.

## Cloud deployment state

Only Identity Toolkit and Pub/Sub were enabled among the queried Auth/AI dependencies. Cloud Functions, Cloud Run, App Check, Vertex AI, Gemini API and Secret Manager were not enabled. No secret inventory can exist through Secret Manager while its API is disabled. Consequently, successful local TypeScript compilation does not indicate that any AI callable, stream, model key or Agent Engine deployment is live.

## Genkit audit

### Critical

1. `functions/src/ai/genkit.ts`, `behavioralAnalysisFlow.ts`, `bargainChef.prompt`, `shopperPrompt.prompt` and `vtoAgent.ts` still reference Gemini 1.5. Current Gemini guidance marks 1.5 as legacy/deprecated. The Genkit CLI examples use `googleAI.model("gemini-flash-latest")`; each migration needs trace/evaluation evidence before deployment.
2. `vtoAgent.ts` configures `vertex-ai-gemini-1.5-pro` while the Genkit instance registers only the Google AI plugin. The model name does not match the configured provider and is also legacy.
3. `generateVirtualTryOn` and `generateSpin360` invoke Google-backed Genkit prompts but do not bind `GEMINI_API_KEY` in their Cloud Function options.
4. `chatStream` can invoke search/research tools whose `SERPAPI_API_KEY` and `PARALLEL_API_KEY` secrets are not bound to that exported function. Defining a secret inside a tool does not make it available to every enclosing function.
5. `chatStream` now rejects a missing or invalid Firebase ID token and malformed prompts after App Check succeeds, with focused real-handler regression tests. CORS is restricted to the two production Firebase Hosting origins.

### High

1. `shopperFlow` declares `locale` as required in the dotprompt but calls the prompt with only `userPrompt`; its `history` input is ignored. This is a runtime schema/conversation defect hidden by TypeScript compilation.
2. Several flows ask for JSON text and then call `JSON.parse` or return empty arrays/default prose on failure. Use model/flow output schemas and fail explicitly; silent empty output violates the zero-mock/fail-fast project rules.
3. `checkUserPermissions` is a production stub that always returns `allowed: true` even though its description claims a real permission check.
4. Tool authorization depends on `ctx.context.auth.uid`, but direct flow/tool delegation paths do not consistently propagate request context. Tests must prove that every mutating or billable tool rejects missing identity.
5. The Interactions API stores interactions by default. Image, wardrobe, behavioral and shopping prompts need an explicit retention/privacy decision (`store=false` where continuity is unnecessary) plus deletion and disclosure handling.

## Gemini Interactions API audit

1. `gemini-3.5-flash` is a current stable Interactions model, so those model strings are valid for ordinary multimodal/structured generation. It is not a Live API model.
2. `discoverPersonalizedProductsFlow` supplies `{ parallelAiSearch: {} } as any`; that tool is not declared by the application and bypasses TypeScript validation. It should use a documented built-in tool or an explicit function tool, and validate returned product records against the flow schema.
3. `identifyVisionObject` forces a function call but reads a `functionCalls` convenience shape instead of handling Interactions steps and returning a function result. This path needs a protocol-level test against `@google/genai` 2.x.
4. Extensive `as any` casts around safety settings, tools and tool configuration remove the compile-time checks that should catch May 2026 Interactions schema changes.
5. Catalog caching serializes the entire Firestore product collection into one request without a size, sensitivity, cost or pagination bound.

## Gemini Live audit

### Blocking protocol defects

1. `generateLiveApiToken` is locally corrected to call `POST /v1beta/auth_tokens`, read the token resource `name`, reject a missing name, and request a one-use token constrained to `gemini-3.1-flash-live-preview`, audio output and session resumption. The real callable handler is covered by red-green regression tests; deployment and a live API integration test remain outstanding.
2. The web Live client now uses the `v1beta` endpoint, ephemeral-token access, setup, `realtimeInput.mediaChunks` and `serverContent`; Android and Meta wearable clients still need the same migration plus session resumption/GoAway handling.
3. `LiveApiClient` directly POSTs to a Firebase callable as if it were a plain endpoint, omits the callable request envelope and App Check token, and reads the wrong response envelope. The wearable service uses the shared callable helper, so the two Android paths are inconsistent.
4. The current code retries by creating new tokens/sockets but does not preserve resumable session handles; reconnects can lose conversation state and duplicate media/tool operations.

## Google ADK audit

The repository installs `google-adk` but `agents/chef/agent.py` does not import `google.adk`, define `root_agent`, define an ADK `App`, create a Runner, or configure a session/memory service. It is an Antigravity SDK wrapper and must not be described or deployed as an ADK agent.

Additional blockers:

1. `agents/chef/requirements.txt` is entirely unpinned. A fresh resolution selected `google-adk 2.7.1`, `google-genai 2.19.0`, but downgraded `google-antigravity` from current 0.1.14 to 0.1.12 because of transitive constraints. Builds are not reproducible.
2. There is no `__init__.py` re-export, discoverable `root_agent`, ADK CLI smoke test, pytest suite, eval set, deployment manifest or persistent production session service.
3. `ChefAgent.agent` is nullable but used without a setup guard; streaming errors are printed and swallowed, terminating output without a typed failure event.
4. Audio-only event handling drops model text, tool calls, interruptions, usage, finish reasons and resumability signals.
5. `agents/tool_server/requirements.txt` contains the literal malformed line `requests\nstripe`; that service cannot resolve both dependencies as intended.

## Required order of correction

1. Rotate the exposed Google OAuth client secret; register Play App Signing fingerprints when available.
2. Provision App Check, Secret Manager and the approved AI runtime APIs; create/bind secrets without exposing values.
3. Migrate all Live clients to one current protocol implementation, then run an authenticated integration test against the deployed, model-constrained token function.
4. Replace legacy Genkit model IDs, bind endpoint secrets, enforce authenticated context/CORS, and add schema-based outputs.
5. Decide whether Chef is Google ADK or Antigravity. If ADK, rebuild it as a discoverable `root_agent`/`App` with Runner, production sessions, tests and evals; otherwise remove the inaccurate ADK architecture claim and unnecessary dependency.
6. Run emulator/unit tests, Genkit traces/evals, ADK headless JSONL tests, authenticated integration tests and physical-device Live/DAT tests before enabling customer features.

## Validation performed

- Firebase CLI project/app/Hosting verification
- Firebase Auth declarative deployment and Identity Toolkit configuration verification
- Android debug signing report and Firebase SHA registration
- Genkit CLI 1.41.0 documentation lookup
- Functions `npm run build` (passes)
- Functions `npm test` (four focused Live-token and stream-auth handler tests pass)
- Python syntax compilation for the agent files (passes)
- Isolated Python dependency dry run (resolves, but demonstrates unpinned downgrading)
- Current official Gemini model, Interactions, Live token and Google ADK guidance review
