import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hook = readFileSync("src/hooks/useWardrobeState.ts", "utf8");
const state = readFileSync("src/lib/convexState.ts", "utf8");
const reactiveState = readFileSync("convex/reactiveState.ts", "utf8");
const schema = readFileSync("convex/schema.ts", "utf8");
const mediaActions = readFileSync("convex/media/actions.ts", "utf8");
const tryOnModal = readFileSync("src/components/VirtualTryOnModal.tsx", "utf8");
const wardrobeInteractions = readFileSync("src/hooks/useWardrobeInteractions.ts", "utf8");
const lensModal = readFileSync("src/components/GoogleLensScreenWidgetModal.tsx", "utf8");
const cameraModal = readFileSync("src/components/CameraObjectDetectionModal.tsx", "utf8");
const smartVision = readFileSync("src/components/SmartVisionView.tsx", "utf8");
const convexState = readFileSync("src/lib/convexState.ts", "utf8");
const visionAction = readFileSync("convex/vision.ts", "utf8");
const personalChat = readFileSync("src/components/features/chat/PersonalAIShopperChatPage.tsx", "utf8");
const creatorChat = readFileSync("src/components/features/chat/CreatorGenAIAgentsChatPage.tsx", "utf8");
const studioModal = readFileSync("src/components/GenkitCreativeStudioModal.tsx", "utf8");
const aiGeneration = readFileSync("convex/aiGeneration.ts", "utf8");
const travelPage = readFileSync("src/components/features/travel/TravelTripsPage.tsx", "utf8");
const travelContract = readFileSync("convex/travel.ts", "utf8");

 test("wardrobe state has no Firestore read or write path", () => {
  assert.doesNotMatch(hook, /firebase\/firestore|\bdb\b|setDoc|getDoc|onSnapshot|localStorage|spresso_wardrobe_prefs/);
  assert.match(hook, /useConvexWardrobe/);
  assert.match(hook, /addWardrobeItem/);
  assert.match(hook, /removeWardrobeItem/);
});

test("wardrobe mutations are authenticated and media ownership is verified", () => {
  assert.match(reactiveState, /requireFirebaseIdentity\(ctx\)/);
  assert.match(reactiveState, /Wardrobe media ownership could not be verified/);
  assert.match(reactiveState, /Uploaded wardrobe items require verified media ownership/);
  assert.match(schema, /wardrobeItems: defineTable/);
  assert.match(schema, /mediaAssetId: v\.optional\(v\.id\("mediaAssets"\)\)/);
});

test("uploaded bytes use the Bunny adapter and fail when Bunny is unconfigured", () => {
  assert.match(mediaActions, /export const storeUploadedBytes/);
  assert.match(mediaActions, /bunnyConfigFromEnv\(env\)/);
  assert.match(mediaActions, /store\.putGenerated/);
  assert.doesNotMatch(hook, /localStorage|spresso_wardrobe_prefs/);
});

test("liked products and saved outfits have Convex contracts", () => {
  assert.match(schema, /likedProducts: defineTable/);
  assert.match(schema, /wardrobeOutfits: defineTable/);
  assert.match(reactiveState, /export const listLikedProducts/);
  assert.match(reactiveState, /export const saveWardrobeOutfit/);
  assert.match(state, /listLikedProducts/);
  assert.match(state, /listWardrobeOutfits/);
});

test("try-on and outfit generation have no Firebase callable or Storage path", () => {
  for (const [name, source] of [["VirtualTryOnModal", tryOnModal], ["useWardrobeInteractions", wardrobeInteractions]]) {
    assert.doesNotMatch(source, /httpsCallable|firebase\/functions|firebase\/storage|generateVirtualTryOn|vitposeOrchestrateFit|uploadBytes|getDownloadURL/, `${name} still references legacy Firebase paths`);
  }
  assert.match(tryOnModal, /useConvexTryOn/);
  assert.match(tryOnModal, /runTryOnJob/);
  assert.match(wardrobeInteractions, /api\.aiGeneration\.generateOutfit/);
});

test("try-on provider fails explicitly and outputs go through the Bunny boundary", () => {
  assert.match(schema, /outfitId: v\.optional\(v\.id\("wardrobeOutfits"\)\)/);
  assert.match(mediaActions, /TRYON_PROVIDER_UNCONFIGURED/);
  assert.match(mediaActions, /TRYON_VIDEO_UNSUPPORTED/);
  assert.match(mediaActions, /storeFromUrl|store\.putGenerated/);
  assert.doesNotMatch(mediaActions, /firebase\/storage|firebasestorage\.googleapis\.com|uploadBytes|getDownloadURL/i);
});

test("lens and camera vision have no Firebase callable path", () => {
  for (const [name, source] of [["GoogleLensScreenWidgetModal", lensModal], ["CameraObjectDetectionModal", cameraModal], ["SmartVisionView", smartVision]]) {
    assert.doesNotMatch(source, /httpsCallable|firebase\/functions|"lensSearch"|firebase\/storage|uploadBytes|getDownloadURL/, `${name} still references legacy Firebase paths`);
  }
  assert.match(lensModal, /useConvexVisionSearch/);
  assert.match(cameraModal, /useConvexVisionSearch/);
  assert.match(smartVision, /useConvexVisionSearch/);
  assert.match(convexState, /export function useConvexVisionSearch/);
  assert.match(convexState, /api\.vision\.searchByImage/);
  assert.match(convexState, /api\.media\.actions\.storeUploadedBytes/);
});

test("the Convex vision contract is authenticated and fails honestly", () => {
  assert.match(visionAction, /requireFirebaseIdentity\(ctx\)/);
  assert.match(visionAction, /assertOwnedPrivateMediaKey/);
  assert.match(visionAction, /VISION_PROVIDER_UNCONFIGURED/);
  assert.match(visionAction, /no product matches/);
  assert.doesNotMatch(visionAction, /firebase\/storage|firebasestorage\.googleapis\.com/i);
  // Captured images must flow through the private media boundary, not raw base64 args.
  assert.match(visionAction, /imageMediaKey: v\.string\(\)/);
  assert.doesNotMatch(visionAction, /imageBase64: v\.string\(\)/);
});

test("AI and creator surfaces have no Firebase callable or legacy chat-stream path", () => {
  for (const [name, source] of [["PersonalAIShopperChatPage", personalChat], ["CreatorGenAIAgentsChatPage", creatorChat], ["GenkitCreativeStudioModal", studioModal]]) {
    assert.doesNotMatch(source, /httpsCallable|firebase\/functions|getQuickPrompts|creatorAgentTemplates|creatorAgentsMetadata|generateCreatorCampaign.*httpsCallable|streamSpressoChat/, `${name} still references legacy Firebase paths`);
  }
  assert.match(personalChat, /useConvexAiStudio/);
  assert.match(creatorChat, /useConvexAiStudio/);
  assert.match(creatorChat, /api\.aiChat\.sendMessage/);
  assert.match(studioModal, /useConvexAiStudio/);
  assert.match(convexState, /api\.creator\.listQuickPrompts/);
  assert.match(convexState, /api\.aiGeneration\.generateCreatorCampaign/);
});

test("the campaign contract runs the gateway with validated structured output", () => {
  assert.match(aiGeneration, /export const generateCreatorCampaign = action/);
  assert.match(aiGeneration, /CreatorCampaignSchema\.parse/);
  assert.match(aiGeneration, /convexGateway\(configuredLlmModel\(\)\)/);
  assert.match(aiGeneration, /sanitizeUntrustedText/);
  assert.doesNotMatch(aiGeneration, /genkit|firebase\/functions/i);
});

test("travel has no Data Connect, Firestore, or Firebase Functions path", () => {
  assert.doesNotMatch(travelPage, /spresso-connector|dataConnect|getTrips|getItineraryEvents|getTravelExpenses|getVoiceNotes|createTravelExpense|cloudfunctions\.net|firebasestorage|firebase\/storage/);
  assert.match(travelPage, /api\.travel\.listTrips/);
  assert.match(travelPage, /api\.travel\.listTripDetail/);
  assert.match(travelPage, /api\.travel\.addExpense/);
  assert.match(travelPage, /api\.media\.actions\.storeUploadedBytes/);
  assert.match(travelPage, /api\.travel\.parseReceiptImage/);
  assert.match(travelContract, /requireFirebaseIdentity\(ctx\)/);
  assert.match(travelContract, /assertOwnedPrivateMediaKey/);
  assert.match(travelContract, /export const seedFromLegacy = internalMutation/);
  assert.doesNotMatch(travelContract, /firebase\/storage|firebasestorage\.googleapis\.com|cloudfunctions\.net|firebase\/firestore|firebasegen/i);
});
