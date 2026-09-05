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

### Backend Function Tests
Run the Firebase Functions TypeScript build and focused Node handler tests:
```bash
cd functions
npm test
```

These tests invoke the real Firebase callable/HTTP handlers and replace only external provider boundaries. New backend behavior follows red-green-refactor: run the focused test first and confirm the expected failure before changing production code.

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
