import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const onboarding = read("src/components/GamifiedOnboardingModal.tsx");
const profileHeader = read("src/components/features/profile/widgets/ProfileHeader.tsx");
const appPreferences = read("src/components/features/profile/widgets/AppPreferencesWidget.tsx");
const profilePage = read("src/components/features/profile/ProfilePage.tsx");
const subscriptionModal = read("src/components/features/profile/dialogs/SubscriptionModal.tsx");
const paymentCards = read("src/components/features/profile/widgets/PaymentCardsWidget.tsx");
const deactivation = read("src/components/features/profile/widgets/AccountDeactivationWidget.tsx");
const state = read("src/lib/convexState.ts");

const LEGACY = /httpsCallable|firebase\/functions|firebase\/firestore|firebase\/storage|@firebasegen|getFirestore|getStorage|uploadString|getDownloadURL|deleteDoc|setDoc\(|Firestore|localStorage/;

test("onboarding avatar and preferences run through Convex with no Firebase Storage/Functions", () => {
  assert.match(onboarding, /useConvexOnboarding/);
  assert.match(onboarding, /storeUploadedBytes/);
  assert.match(onboarding, /setPreferences\(\{/);
  assert.doesNotMatch(onboarding, LEGACY);
  // Avatar upload failure must surface honestly, never silently continue.
  assert.match(onboarding, /setErrorMessage\(/);
});

test("profile header writes go to Convex; Firestore and Data Connect paths are gone", () => {
  assert.match(profileHeader, /useConvexProfile/);
  assert.match(profileHeader, /saveProfileToConvex\(\{/);
  // Firebase Auth updateProfile remains as the identity-display path only.
  assert.match(profileHeader, /from "firebase\/auth"/);
  assert.doesNotMatch(profileHeader, LEGACY);
});

test("app preferences read and write Convex preference state with rollback on failure", () => {
  assert.match(appPreferences, /useConvexPreferences/);
  assert.match(appPreferences, /setPreferences\(\{ pushNotifications/);
  assert.match(appPreferences, /setPreferences\(\{ theme:/);
  assert.doesNotMatch(appPreferences, LEGACY);
});

test("profile page reads derived entitlement instead of Data Connect subscriptions", () => {
  assert.match(profilePage, /useConvexProfile/);
  assert.match(profilePage, /entitlement/);
  assert.doesNotMatch(profilePage, LEGACY);
  assert.doesNotMatch(profilePage, /getUserSubscription/);
});

test("subscription modal never writes a tier client-side", () => {
  assert.doesNotMatch(subscriptionModal, LEGACY);
  assert.doesNotMatch(subscriptionModal, /upsertUserSubscription/);
  assert.match(subscriptionModal, /Stripe checkout/);
});

test("payment cards accept Stripe PaymentMethod IDs only — no raw card data", () => {
  assert.doesNotMatch(paymentCards, LEGACY);
  assert.doesNotMatch(paymentCards, /newCardNumber|Card Number|placeholder="4242|MM\/YY/);
  assert.match(paymentCards, /stripePaymentMethodId/);
  assert.match(paymentCards, /useConvexPaymentMethods/);
});

test("deactivation calls the Convex purge and never deletes a Firestore doc", () => {
  assert.match(deactivation, /useConvexProfile/);
  assert.match(deactivation, /deactivateAccount/);
  assert.doesNotMatch(deactivation, LEGACY);
});

test("state gateway exposes profile, payment-method, and onboarding hooks with auth gates", () => {
  assert.match(state, /useConvexProfile/);
  assert.match(state, /useConvexPaymentMethods/);
  assert.match(state, /useConvexOnboarding/);
  assert.match(state, /isAuthenticated \? \{\} : "skip"/);
});
