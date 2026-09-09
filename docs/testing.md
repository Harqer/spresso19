# Spresso Android Testing Strategy

This document outlines the testing strategy for the Spresso Kotlin Multiplatform (Android Compose) application.

## Overview

The testing architecture uses Koin for Dependency Injection, enabling runtime fakes. It also incorporates multiple layers of testing (Unit, UI Component, and Screenshot tests) using modern Android testing frameworks.

## Frameworks & Tools
- **Unit Testing**: JUnit4, Kotlinx Coroutines Test, MockK
- **UI Behavior Testing**: Compose Testing APIs (`ui-test-junit4`)
- **Dependency Injection**: Koin (`koin-test`)
- **Screenshot Testing**: Dropshots (for on-device/instrumented screenshots) and Compose Preview Screenshot Testing tool (`com.android.compose.screenshot`)
- **Coverage**: Jacoco

## How to Run Tests

### Active backend and boundary tests
Run the Convex contract tests and typecheck:
```bash
npx vitest run convex --passWithNoTests
npx tsc -p convex/tsconfig.json --noEmit --pretty false
```

These tests exercise authenticated ownership, trial expiry, AI guardrails, commerce state transitions, idempotency, and Bunny media contracts. External provider boundaries use contract-compatible test seams; no production path falls back to synthetic data.

Run the MCP boundary test with local loopback access:
```bash
npm run test:mcp
```

The MCP test must bind a local ephemeral port. In restricted sandboxes, run it with the environment's approved loopback permission; an `EPERM` bind failure is an environment limitation, not an application result.

Run the production web build and static checks:
```bash
npm run lint
npm run build
git diff --check
```

### End-to-end coverage contract

Every release audit must account for these seams:

- Convex auth and user ownership
- Chat thread creation, streaming generation, prompt-injection guardrails, rate limits, and trial expiry
- Product discovery and MCP read-only tools with strict origin policy
- CameraX physical-camera detection, labeling, live-vision context, and photo/video capture
- Lens screen inspection through Android `MediaProjectionScreenCapture`; never camera input
- Generated still/video virtual try-on media and Bunny upload/signed delivery
- Meta DAT registration, permissions, session lifecycle, camera/display/audio capability failures
- Cart intent, fresh merchant quote, explicit human payment confirmation, Stripe webhook reconciliation
- Orders, returns, privacy, retention, retries, idempotency, and server-side audit logging

Device-only seams (CameraX, Lens, and Meta DAT) require Android/emulator or approved hardware verification; repository tests do not claim those flows are covered.

### 1. Local Unit Tests
Run unit tests for both common and Android source sets locally without an emulator:
```bash
./gradlew :composeApp:testDebugUnitTest
```

### 2. Instrumented UI Tests
Run behavior UI and instrumented tests on an emulator or physical device. Ensure your emulator is running before executing this:
```bash
./gradlew :composeApp:connectedDebugAndroidTest
```

### 3. Screenshot Tests
**Record Screenshots (Update References)**:
To update or generate new baseline screenshot references using Dropshots:
```bash
./gradlew :composeApp:connectedDebugAndroidTest -Pdropshots.record
```
The reference images are saved under the module's screenshot reference directory.

**Verify Screenshots**:
To assert against the recorded reference screenshots:
```bash
./gradlew :composeApp:connectedDebugAndroidTest
```

**Compose Preview Screenshot Validation**:
To run the Compose Preview Screenshot tests (if applicable):
```bash
./gradlew :composeApp:previewScreenshot
```

## Adding Fakes
When testing UI components, replace network calls, location APIs, or databases with runtime fakes using Koin. Create a separate test module or use `koin-test` to override specific definitions before starting the compose test rule.
