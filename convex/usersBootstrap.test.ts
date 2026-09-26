import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import agent from "@convex-dev/agent/test";
import rateLimiter from "@convex-dev/rate-limiter/test";

const modules = import.meta.glob("./**/*.ts");

const issuer = "https://securetoken.google.com/get-spresso";
const identityOf = (uid: string) => ({
  issuer,
  subject: uid,
  tokenIdentifier: `${issuer}:${uid}`,
});
const owner = identityOf("firebase-uid-owner");
const other = identityOf("firebase-uid-other");

function testConvex() {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  return t;
}

test("bootstrap is idempotent and initializes the required preference defaults", async () => {
  const t = testConvex();
  const first = await t.withIdentity(owner).mutation(api.users.bootstrap, {
    email: "owner@example.com",
    displayName: "Owner",
  });
  expect(first).toMatchObject({
    firebaseUid: owner.subject,
    email: "owner@example.com",
    displayName: "Owner",
    onboardingCompleted: false,
  });

  // Second call: same identity, no duplicate rows, hints do not overwrite.
  const second = await t.withIdentity(owner).mutation(api.users.bootstrap, {
    email: "different@example.com",
    displayName: "Renamed",
  });
  expect(second.userId).toBe(first.userId);
  expect(second.email).toBe("owner@example.com");

  await t.run(async (ctx) => {
    const users = await ctx.db.query("users").collect();
    expect(users).toHaveLength(1);
    const prefs = await ctx.db.query("preferences").collect();
    expect(prefs).toHaveLength(1);
    expect(prefs[0].galleryPermission).toBe("UNDETERMINED");
    expect(prefs[0].onboardingCompleted).toBe(false);
    expect(prefs[0].tokenIdentifier).toBe(owner.tokenIdentifier);
  });
});

test("bootstrap reconciles a migrated firebaseUid row instead of duplicating it", async () => {
  const t = testConvex();
  // A pre-Phase-1 row keyed by an older tokenIdentifier for the same UID.
  const legacyId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      firebaseUid: owner.subject,
      tokenIdentifier: `${issuer}:legacy-instance`,
      email: "legacy@example.com",
      createdAt: Date.now(),
    }),
  );

  const result = await t.withIdentity(owner).mutation(api.users.bootstrap, {});
  expect(result.userId).toBe(legacyId);

  await t.run(async (ctx) => {
    const claimed = await ctx.db.get(legacyId);
    expect(claimed?.tokenIdentifier).toBe(owner.tokenIdentifier);
    const users = await ctx.db.query("users").collect();
    expect(users).toHaveLength(1);
    // Preferences row established for the claimed identity.
    const prefs = await ctx.db.query("preferences").collect();
    expect(prefs).toHaveLength(1);
  });
});

test("bootstrap rejects unauthenticated and non-Firebase issuers", async () => {
  const t = testConvex();
  await expect(t.mutation(api.users.bootstrap, {})).rejects.toThrow(/[Uu]nauthenticated/);
  await expect(
    t.withIdentity({ issuer: "https://evil.example", subject: "x", tokenIdentifier: "https://evil.example:x" }).mutation(api.users.bootstrap, {}),
  ).rejects.toThrow(/issuer/);
});

test("updatePreferences is owner-scoped and fails closed before bootstrap", async () => {
  const t = testConvex();
  await expect(t.withIdentity(owner).mutation(api.users.updatePreferences, { onboardingCompleted: true })).rejects.toThrow(
    /Preferences not initialized/,
  );

  await t.withIdentity(owner).mutation(api.users.bootstrap, {});
  await t.withIdentity(owner).mutation(api.users.updatePreferences, {
    onboardingCompleted: true,
    galleryPermission: "GRANTED",
  });

  const state = await t.withIdentity(owner).query(api.users.meWithPreferences, {});
  expect(state?.preferences).toMatchObject({ onboardingCompleted: true, galleryPermission: "GRANTED" });

  // The other identity has nothing: no rows leaked across owners.
  const theirs = await t.withIdentity(other).query(api.users.meWithPreferences, {});
  expect(theirs).toBeNull();
  await expect(
    t.withIdentity(other).mutation(api.users.updatePreferences, { onboardingCompleted: true }),
  ).rejects.toThrow(/Preferences not initialized/);
});

test("meWithPreferences requires authentication", async () => {
  const t = testConvex();
  await expect(t.query(api.users.meWithPreferences, {})).rejects.toThrow(/[Uu]nauthenticated/);
});
