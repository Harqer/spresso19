# Fix Compose Preview Tool Failure

Address the "Failed to find preview element" error in the `render_compose_preview` tool to enable direct UI visualization in the chat.

## User Review Required

> [!IMPORTANT]
> The current environment is reporting a Gradle service error (`AndroidLocationsBuildService`). This implementation plan involves modifying build configurations and environment settings to resolve this, which might affect local build behavior.

## Proposed Changes

### Build Configuration & Environment

#### [MODIFY] [build.gradle.kts](file:///home/shaolin/Spresso/composeApp/build.gradle.kts)
- Ensure all necessary preview and UI tooling dependencies are correctly declared for both `commonMain` and `androidMain`.
- Verify the `composeCompiler` and `jetbrainsCompose` plugin versions are compatible with the current environment.

#### [MODIFY] [gradle.properties](file:///home/shaolin/Spresso/gradle.properties)
- Add flags to stabilize the Gradle daemon and potentially bypass the `AndroidLocationsBuildService` issue (e.g., setting a explicit `android.dir` if needed).

### Preview Implementation Standard

#### [MODIFY] [ChatBubbleText.kt](file:///home/shaolin/Spresso/composeApp/src/commonMain/kotlin/components/atoms/ChatBubbleText.kt) (and others)
- Ensure previews are top-level functions.
- Verify visibility is `public` (default).
- Standardize on `org.jetbrains.compose.ui.tooling.preview.Preview` for `commonMain`.

## Verification Plan

### Automated Verification
- Run `./gradlew :composeApp:assembleDebug` and ensure it passes (required for the preview tool to function).
- Call `render_compose_preview` with a specific FQN and file path.

### Manual Verification
- Verify that the tool returns an image and semantic hierarchy instead of an error.
- Check the layout in the chat response.
