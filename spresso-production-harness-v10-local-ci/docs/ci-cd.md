# Local CI/CD Gate

The executable source of truth is `scripts/ci.sh`. The agent should run it after production implementation; Husky runs it again on `pre-push`.

No GitHub Actions are required.

The gate does **not**:
- deploy production
- read Infisical
- require secret values to exist
- validate provider credentials
- mutate Convex production

It **does** detect accidentally committed secret material.

Coverage:
- repository/structured-file integrity
- syntax, unresolved references and compile errors
- unused imports/exports/symbols/dependencies
- Kotlin/KMP/Android/Compose lint + configured static analysis
- TypeScript/JavaScript lint/typecheck/build/tests
- Convex codegen/typecheck/tests when present
- release/R8/AAB/Web builds when configured
- Semgrep, OSV-Scanner, Trivy, Checkov, detect-secrets, ShellCheck
- SBOM + Grype when installed
- OWASP ZAP passive baseline scan against a local web target

ZAP never automatically active-scans a remote environment. Full/active scans require a deliberate separate command and target authorization.
