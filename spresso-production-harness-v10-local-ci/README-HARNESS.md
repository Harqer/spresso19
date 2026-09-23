# Spresso Agent Harness

This harness supplies steering and executable gates rather than duplicating framework documentation.

Core:
- `AGENTS.md` — routing and hard gates
- `ARCHITECTURE.md` — Spresso-specific decisions/invariants
- `PROGRESS.md` — pre-implementation + production-ready checklist
- `feature_list.json` — durable feature status
- `docs/workflow.md` — autonomous production loop
- `docs/features.md` — concise feature contracts
- `docs/merchant-browser-automation.md` — adaptive chat/browser UI + Cloudflare Browser Run/Kitesurf implementation contract
- `docs/convex.md` — Convex steering only
- `docs/meta-wearables-dat.md` — full-plugin DAT steering
- `docs/glimmer.md` — Glimmer/XR boundary
- `docs/evaluation.md` — external evaluator

Local enforcement:
- `.husky/pre-push` → `scripts/ci.sh`
- `scripts/quality.sh` — structured files, shell, placeholder scan, Gradle/KMP/Android, JS/TS, Convex
- `scripts/security.sh` — Semgrep, OSV-Scanner, Trivy, Checkov, detect-secrets, package audit, optional SBOM/Grype
- `scripts/zap.sh` — OWASP ZAP passive baseline against a local web target

The gate never reads Infisical, requires provider secrets, deploys production, or uses GitHub Actions. It may detect secret material accidentally committed to source.

Implementation detail still comes from installed official skills/plugins/current package types and docs.
