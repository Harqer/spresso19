import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-travel-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-travel-owner",
};
const other = {
  ...owner,
  subject: "firebase-travel-other",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-travel-other",
};

const legacyTrip = {
  legacyId: "trip-legacy-1",
  title: "Tokyo Trip",
  destination: "Tokyo",
  startDate: "2026-10-01",
  endDate: "2026-10-08",
  status: "IN_PROGRESS" as const,
  budgetTotal: 3000,
  tokenIdentifier: owner.tokenIdentifier,
};

async function seedTrip(t: ReturnType<typeof convexTest>) {
  const result = await t.mutation(internal.travel.seedFromLegacy, {
    trips: [legacyTrip],
    events: [{ legacyId: "evt-1", legacyTripId: "trip-legacy-1", type: "flight" as const, title: "Flight to Tokyo", description: "Nonstop", eventTime: "2026-10-01T09:00:00Z", location: "SFO", confirmationCode: "ABC123" }],
    expenses: [{ legacyId: "exp-1", legacyTripId: "trip-legacy-1", amount: 120.5, currency: "USD", category: "Dining" as const, merchant: "Ichiran", date: "2026-10-02" }],
    voiceNotes: [{ legacyId: "vn-1", legacyTripId: "trip-legacy-1", transcript: "Loved the ramen", createdAt: 1_000 }],
  });
  return result;
}

test("travel reads require an authenticated Firebase identity", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.travel.listTrips, {})).rejects.toThrow(/[Uu]nauthenticated/);
});

test("legacy seed is idempotent and detail reads are owner-scoped", async () => {
  const t = convexTest(schema, modules);
  const first = await seedTrip(t);
  expect(first).toEqual({ trips: 1, events: 1, expenses: 1, voiceNotes: 1 });

  // Re-seeding the same legacy ids updates in place.
  const second = await t.mutation(internal.travel.seedFromLegacy, {
    trips: [{ ...legacyTrip, title: "Tokyo Trip v2" }],
  });
  expect(second).toEqual({ trips: 1, events: 0, expenses: 0, voiceNotes: 0 });

  const { trips } = await t.withIdentity(owner).query(api.travel.listTrips, {});
  expect(trips).toHaveLength(1);
  expect(trips[0]).toMatchObject({ title: "Tokyo Trip v2", destination: "Tokyo", status: "IN_PROGRESS" });

  const detail = await t.withIdentity(owner).query(api.travel.listTripDetail, { tripId: trips[0].id });
  expect(detail.events[0]).toMatchObject({ title: "Flight to Tokyo", confirmationCode: "ABC123" });
  expect(detail.expenses[0]).toMatchObject({ merchant: "Ichiran", amount: 120.5 });
  expect(detail.voiceNotes[0]).toMatchObject({ transcript: "Loved the ramen" });

  // Another user can never read this trip, even with its id.
  await expect(
    t.withIdentity(other).query(api.travel.listTripDetail, { tripId: trips[0].id }),
  ).rejects.toThrow(/Trip not found for this user/);
});

test("addExpense enforces ownership and validates input", async () => {
  const t = convexTest(schema, modules);
  await seedTrip(t);
  const { trips } = await t.withIdentity(owner).query(api.travel.listTrips, {});
  const tripId = trips[0].id;

  await expect(
    t.withIdentity(other).mutation(api.travel.addExpense, { tripId, amount: 10, currency: "USD", category: "Dining", merchant: "Cafe" }),
  ).rejects.toThrow(/Trip not found for this user/);
  await expect(
    t.withIdentity(owner).mutation(api.travel.addExpense, { tripId, amount: -5, currency: "USD", category: "Dining", merchant: "Cafe" }),
  ).rejects.toThrow(/valid expense amount/);
  await expect(
    t.withIdentity(owner).mutation(api.travel.addExpense, { tripId, amount: 10, currency: "DOLLAR", category: "Dining", merchant: "Cafe" }),
  ).rejects.toThrow(/valid currency/);

  await t.withIdentity(owner).mutation(api.travel.addExpense, {
    tripId, amount: 42, currency: "usd", category: "Shopping", merchant: "Don Quijote",
  });
  const detail = await t.withIdentity(owner).query(api.travel.listTripDetail, { tripId });
  expect(detail.expenses).toHaveLength(2);
  expect(detail.expenses[0]).toMatchObject({ merchant: "Don Quijote", currency: "USD" });
});

test("voice notes validate ownership of the referenced audio asset", async () => {
  const t = convexTest(schema, modules);
  await seedTrip(t);
  const { trips } = await t.withIdentity(owner).query(api.travel.listTrips, {});
  const tripId = trips[0].id;

  const foreignKey = `private/users/${other.subject}/generated/${"b".repeat(64)}.webm`;
  await t.mutation(internal.media.recordAsset, {
    tokenIdentifier: other.tokenIdentifier,
    mediaKey: foreignKey,
    mimeType: "audio/webm",
    byteLength: 10,
    sha256: "b".repeat(64),
  });

  await expect(
    t.withIdentity(owner).mutation(api.travel.createVoiceNote, { tripId, transcript: "note", audioMediaKey: foreignKey }),
  ).rejects.toThrow(/does not belong to the authenticated user/);

  const created = await t.withIdentity(owner).mutation(api.travel.createVoiceNote, { tripId, transcript: "note" });
  const detail = await t.withIdentity(owner).query(api.travel.listTripDetail, { tripId });
  expect(detail.voiceNotes.some((row: { id: string }) => row.id === created)).toBe(true);
});

test("receipt parsing fails explicitly without a verified owned asset", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.withIdentity(owner).action(api.travel.parseReceiptImage, { receiptMediaKey: "private/users/firebase-travel-owner/generated/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg" }),
  ).rejects.toThrow(/Receipt image not found for this user/);
});
