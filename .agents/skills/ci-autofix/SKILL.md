---
name: ci-autofix
description: Event-driven GitHub Actions CI auto-fix pipeline. Intercepts errors on demand with zero periodic polling or success noise.
---

# Event-Driven CI Error-Only Auto-Fix Standard

## Operational Protocol
1. **Silent Success Policy**: Never report or notify on successful GitHub Actions runs or status checks. Only engage when a failure or build error occurs.
2. **Zero Local APK Build Overhead**: Never run `./gradlew assembleDebug` or generate `.apk` binaries locally unless explicitly instructed by the USER.
3. **Event-Driven Failure Recovery**:
   - When a GitHub Actions workflow run fails on `origin main`, fetch the error traceback using `gh run view <run-id> --repo Harqer/spresso19 --log-failed`.
   - Diagnose the root cause (TypeScript type errors, Kotlin syntax errors, Android Lint, etc.).
   - Apply the surgical fix directly to the source files.
   - Run lightweight local verification (`npm run lint` or `npx tsc --noEmit`).
   - Push the fix to `origin main`.
