# Convex Steering

The installed Convex skills/components are the implementation source of truth. Do not duplicate them here.

For any work touching `convex/`:

1. Inventory the installed official Convex skills/components relevant to the feature.
2. Read every applicable skill completely, including sibling lifecycle/security/verification sections.
3. For version-sensitive APIs, verify against installed package exports/types and current official Convex docs.
4. Inspect `convex/schema.ts`, `convex/convex.config.ts`, generated API, auth config, and the existing function path before editing.
5. Prefer existing Convex primitives/components over hand-rolled substitutes when they match the requirement.
6. Verify codegen, typecheck, backend tests, and deployment compilation/push where applicable.
7. Fix and retry failures before reporting them.

Spresso overrides:
- Firebase Auth remains the identity provider.
- Convex owns backend authorization, application state, realtime state, scheduling/workflows, and AI/tool orchestration.
- Infisical is the secret source; populate required Convex/provider runtime env through the secure deployment path.
- Bunny owns private media where configured.
- dedicated voice/video media transport is not replaced by Convex realtime state.
- AI never authorizes purchases.

Important Convex invariants:
- mutations already provide atomic/serializable transactional semantics; do not recreate locks
- queries are deterministic and bounded/indexed
- external IO belongs in actions/workflows and must be idempotent/reconcilable
- public functions enforce server-side authz/ownership
- potentially growing reads are indexed/paginated/bounded
- migrations use compatible schema → backfill → verify → tighten
- deployment target must be known before deploy/env/import/export actions
