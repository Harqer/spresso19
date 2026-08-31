# Discovery and Merchant Routing Release Evidence

## Verified repository checks

- Provider provenance tests pass.
- Cart and server-owned quote boundary tests pass.
- Kitesurf staging safety tests pass.
- Secret binding audit passes for launch discovery providers.
- Web discovery repository tests pass.
- Web lint and production build pass.
- Web bundle budget passes with six route chunks.
- Functions build and type checking pass.
- Callable export contract checks pass.
- Strict production mock scanning passes for the current source tree.

## Blocked checks

- Android Gradle cannot start because the environment cannot determine a usable wildcard IP.
- Android passkey registration cannot complete because the backend options and verification callables do not exist. The app fails closed and does not mark registration complete.
- Live Kitesurf staging was not run because Cloudflare Browser Run credentials are unavailable.
- Deployed endpoint checks cannot reach the Hosting origin from this environment.
- The endpoint audit still rejects the static health response. The health route must verify a real dependency and return a failure status when that dependency is unavailable.

## Required before production readiness

1. Deploy and verify the canonical `result.listings` discovery response.
2. Add the WebAuthn registration-options and verification callables, then run Android tests on a working Gradle environment.
3. Run a real Kitesurf public-page staging check with configured Cloudflare credentials.
4. Replace the static health response with a real dependency check.
5. Run deployed endpoint checks against `get-spresso`.
6. Re-run GitNexus impact and change analysis after the dirty worktree is narrowed.

Test fixtures prove validation behavior. They do not prove provider reachability or deployment state.
