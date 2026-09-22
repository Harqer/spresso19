import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const capture = await readFile(
  "composeApp/src/androidMain/kotlin/com/spresso/MediaProjectionScreenCapture.kt",
  "utf8",
);
const mainActivity = await readFile("androidApp/src/main/kotlin/com/spresso/MainActivity.kt", "utf8");
const app = await readFile("composeApp/src/commonMain/kotlin/App.kt", "utf8");
const wardrobeView = await readFile(
  "composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobeViewPage.kt",
  "utf8",
);
const chatPanel = await readFile(
  "composeApp/src/commonMain/kotlin/components/features/chat/PersonalAIShopperChatPanel.kt",
  "utf8",
);
const overlay = await readFile(
  "composeApp/src/commonMain/kotlin/components/features/vision/SmartVisionControlsOverlay.kt",
  "utf8",
);
const convexApi = await readFile("composeApp/src/commonMain/kotlin/network/ConvexApi.kt", "utf8");

test("Lens capture is Android MediaProjection, not a gallery picker", () => {
  assert.match(capture, /class MediaProjectionScreenCapture/);
  assert.match(capture, /createScreenCaptureIntent/);
  assert.match(mainActivity, /requestUserInitiatedScreenCapture/);
  assert.match(mainActivity, /screenCaptureLauncher\.launch\(screenCapture\.permissionIntent\(\)\)/);
  assert.match(mainActivity, /onTriggerGlobalLens = \{\s*requestUserInitiatedScreenCapture\(\)/);
});

test("Lens UI entry points call the global capture callback", () => {
  assert.match(wardrobeView, /onOpenLens: \(\) -> Unit/);
  assert.match(wardrobeView, /onOpenLens = onOpenLens/);
  assert.doesNotMatch(wardrobeView, /onOpenLens = onPickImageRequested/);
  assert.match(app, /onOpenLens = onTriggerGlobalLens/);
  assert.doesNotMatch(app, /onOpenLens = \{ navigator\.navigate\(NavKey\.SmartVisionKey\(\)\) \}/);
  assert.match(overlay, /onTriggerGlobalLens: \(\) -> Unit/);
  assert.match(overlay, /onClick = onTriggerGlobalLens/);
});

test("chat Lens control does not fall back to camera", () => {
  assert.match(chatPanel, /onOpenObjectDetection = onTriggerGlobalLens/);
  assert.doesNotMatch(chatPanel, /onTriggerGlobalLens \?: onLaunchCamera/);
});

test("KMP Lens search uses Convex vision search, not a local mock listing", () => {
  assert.match(convexApi, /suspend fun searchVision\(mediaKey: String\)/);
  assert.match(convexApi, /post\("\/api\/vision\/search"/);
});

test("deleted React lens backup must not return", async () => {
  await assert.rejects(access(".git_old_lens.tsx"));
  await assert.rejects(access("src/components"));
});
