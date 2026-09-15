import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-owner",
};
const other = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-other",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-other",
};

async function bootstrapAs(t: ReturnType<typeof convexTest>, identity: typeof owner) {
  return await t.withIdentity(identity).mutation(api.users.bootstrap, {
    email: "owner@example.com",
    displayName: "Owner",
  });
}

test("profile update is authenticated, owner-scoped, and visible only to its owner", async () => {
  const t = convexTest(schema, modules);
  await bootstrapAs(t, owner);
  await bootstrapAs(t, other);

  await t.withIdentity(owner).mutation(api.users.updateProfile, {
    displayName: "Alex R.",
    photoUrl: "https://cdn.example/avatar.jpg",
  });

  const mine = await t.withIdentity(owner).query(api.users.me, {});
  expect(mine).toMatchObject({ displayName: "Alex R.", photoUrl: "https://cdn.example/avatar.jpg" });
  const theirs = await t.withIdentity(other).query(api.users.me, {});
  expect(theirs).toMatchObject({ displayName: "Owner" });
  await expect(t.query(api.users.me, {})).rejects.toThrow(/[Uu]nauthenticated/);
});

test("entitlement is derived from the trial window and never client-writable", async () => {
  const t = convexTest(schema, modules);
  await bootstrapAs(t, owner);

  const entitlement = await t.withIdentity(owner).query(api.users.getEntitlement, {});
  expect(entitlement).toMatchObject({ tier: "VIP Member", trialActive: true });
  expect(entitlement.autoRenewDate).toBeTruthy();

  // A fresh user seeded with an expired trial reports an inactive trial.
  const expired = Date.now() - 1000;
  await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier))
      .unique();
    await ctx.db.patch("users", user!._id, { trialStartedAt: expired - 14_000, trialEndsAt: expired });
  });
  const after = await t.withIdentity(owner).query(api.users.getEntitlement, {});
  expect(after.trialActive).toBe(false);
});

test("preferences persist onboarding vibes and avatar media key", async () => {
  const t = convexTest(schema, modules);
  await bootstrapAs(t, owner);

  await t.withIdentity(owner).mutation(api.reactiveState.setPreferences, {
    onboardingCompleted: true,
    vibes: ["streetwear", "luxury"],
    radius: 25,
    locationEnabled: true,
    avatarProfile: {
      usePersonalAvatar: true,
      mediaKey: "private/users/firebase-uid-owner/generated/abc123.jpg",
      fitPreference: "regular",
    },
  });

  const prefs = await t.withIdentity(owner).query(api.reactiveState.getPreferences, {});
  expect(prefs).toMatchObject({
    onboardingCompleted: true,
    vibes: ["streetwear", "luxury"],
    avatarProfile: { usePersonalAvatar: true, mediaKey: "private/users/firebase-uid-owner/generated/abc123.jpg" },
  });
  expect(await t.withIdentity(other).query(api.reactiveState.getPreferences, {})).toBeNull();
});

test("deactivation purges every owner-scoped table, retains orders, and isolates other users", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await bootstrapAs(t, owner);
  const otherId = await bootstrapAs(t, other);

  // Seed owner state across the purge set plus one retained order.
  await t.withIdentity(owner).mutation(api.reactiveState.setPreferences, { vibes: ["streetwear"] });
  await t.withIdentity(owner).mutation(api.reactiveState.setSavedProduct, { productId: "p1", saved: true });
  await t.withIdentity(owner).mutation(api.reactiveState.setLikedProduct, { productId: "p1", liked: true });
  await t.run(async (ctx) => {
    const now = Date.now();
    const attempt = await ctx.db.insert("checkoutAttempts", {
      tokenIdentifier: owner.tokenIdentifier,
      listingId: "listing-1",
      quantity: 1,
      idempotencyKey: "k1",
      status: "COMPLETED",
      createdAt: now,
      updatedAt: now,
      listing: {
        id: "listing-1",
        name: "Jacket",
        merchantUrl: "https://merchant.example/jacket",
        source: "kitesurf" as const,
        discoveredAt: new Date(now).toISOString(),
      },
    });
    await ctx.db.insert("orders", {
      tokenIdentifier: owner.tokenIdentifier,
      checkoutAttemptId: attempt,
      paymentIntentId: "pi_123",
      listingId: "listing-1",
      listing: {
        id: "listing-1",
        name: "Jacket",
        merchantUrl: "https://merchant.example/jacket",
        source: "kitesurf" as const,
        discoveredAt: new Date(now).toISOString(),
      },
      quantity: 1,
      amountCents: 9900,
      currency: "usd",
      merchantUrl: "https://merchant.example/jacket",
      status: "AUTHORIZED" as const,
      createdAt: now,
    });
    await ctx.db.insert("paymentMethods", {
      tokenIdentifier: owner.tokenIdentifier,
      stripePaymentMethodId: "pm_12345678",
      stripeCustomerId: "cus_123",
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2030,
      isDefault: false,
      createdAt: now,
    });
    await ctx.db.insert("mediaAssets", {
      tokenIdentifier: owner.tokenIdentifier,
      mediaKey: "private/users/firebase-uid-owner/generated/x.jpg",
      mimeType: "image/jpeg",
      byteLength: 10,
      sha256: "a".repeat(64),
      createdAt: now,
    });
    await ctx.db.insert("aiUsage", {
      tokenIdentifier: owner.tokenIdentifier,
      model: "m",
      provider: "p",
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      createdAt: now,
    });
  });

  await t.withIdentity(other).mutation(api.reactiveState.setSavedProduct, { productId: "p-other", saved: true });

  await t.withIdentity(owner).mutation(api.users.deactivateAccount, {});

  // Owner data purged; order retained as a financial record.
  await t.run(async (ctx) => {
    expect(await ctx.db.get("users", ownerId)).toBeNull();
    expect(await ctx.db.query("preferences").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect()).toEqual([]);
    expect(await ctx.db.query("savedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect()).toEqual([]);
    expect(await ctx.db.query("likedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect()).toEqual([]);
    expect(await ctx.db.query("paymentMethods").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect()).toEqual([]);
    expect(await ctx.db.query("mediaAssets").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect()).toEqual([]);
    expect(await ctx.db.query("aiUsage").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect()).toEqual([]);
    const orders = await ctx.db.query("orders").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", owner.tokenIdentifier)).collect();
    expect(orders).toHaveLength(1);
    expect(orders[0].paymentIntentId).toBe("pi_123");
    // Another user's data is untouched.
    expect(await ctx.db.get("users", otherId)).not.toBeNull();
    const otherSaves = await ctx.db.query("savedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", other.tokenIdentifier)).collect();
    expect(otherSaves).toHaveLength(1);
  });

  // The deactivated profile is gone; further privileged actions fail explicitly.
  expect(await t.withIdentity(owner).query(api.users.me, {})).toBeNull();
  await expect(t.withIdentity(owner).query(api.users.getEntitlement, {})).rejects.toThrow(/Profile not found/);
  await expect(t.withIdentity(owner).mutation(api.users.updateProfile, { displayName: "Ghost" })).rejects.toThrow(/Profile not found/);
});
