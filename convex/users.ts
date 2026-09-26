import { query, mutation, internalAction, internalMutation, type MutationCtx } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

/**
 * CVX-001 user profile functions.
 *
 * `me` derives the caller's identity server-side (never from arguments) and
 * reads the caller's own document through the token-identifier index.
 * `bootstrap`/`ensureUser` upsert the profile on first authenticated contact.
 * `updateProfile`, `getEntitlement`, and `deactivateAccount` own the app-level
 * profile, entitlement, and account-lifecycle behavior.
 */

export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      firebaseUid: v.string(),
      email: v.optional(v.string()),
      displayName: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      coinbaseWalletAddress: v.optional(v.string()),
      walletNetwork: v.optional(v.string()),
      walletConnectedAt: v.optional(v.string()),
      createdAt: v.number(),
      trialStartedAt: v.optional(v.number()),
      trialEndsAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      stripeCustomerId: user.stripeCustomerId,
      coinbaseWalletAddress: user.coinbaseWalletAddress,
      walletNetwork: user.walletNetwork,
      walletConnectedAt: user.walletConnectedAt,
      createdAt: user.createdAt,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
    };
  },
});

const profileArgs = {
  email: v.optional(v.string()),
  displayName: v.optional(v.string()),
};

async function ensureUserForIdentity(ctx: MutationCtx, args: { email?: string; displayName?: string }) {
  const identity = await requireFirebaseIdentity(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (existing) return existing._id;

  const byUid = await ctx.db
    .query("users")
    .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", identity.firebaseUid))
    .unique();
  if (byUid) {
    await ctx.db.patch("users", byUid._id, {
      tokenIdentifier: identity.tokenIdentifier,
      ...(args.email === undefined ? {} : { email: args.email }),
      ...(args.displayName === undefined ? {} : { displayName: args.displayName }),
    });
    return byUid._id;
  }

  const createdAt = Date.now();
  return await ctx.db.insert("users", {
    firebaseUid: identity.firebaseUid,
    tokenIdentifier: identity.tokenIdentifier,
    email: args.email,
    displayName: args.displayName,
    createdAt,
    trialStartedAt: createdAt,
    trialEndsAt: createdAt + 14 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Canonical authenticated bootstrap (one idempotent mutation):
 *   verified Firebase identity → users row (create, or reconcile a migrated
 *   row by firebaseUid) → exactly one preferences row with required defaults
 *   (galleryPermission UNDETERMINED, onboardingCompleted false) → typed
 *   launch state. Identity derives ONLY from ctx.auth.getUserIdentity(); the
 *   optional email/displayName/photoUrl args are profile hints, never
 *   authorization inputs.
 */
export const bootstrap = mutation({
  args: {
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id("users"),
    firebaseUid: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    // Firebase-owned identity metadata comes FIRST from verified token claims;
    // client-supplied fields are profile hints only (validated below, bounded,
    // never ownership). A claim always wins over a client argument.
    const email = identity.email ?? (typeof args.email === "string" ? args.email.slice(0, 320) : undefined);
    const displayName = identity.name ?? (typeof args.displayName === "string" ? args.displayName.slice(0, 120) : undefined);
    const photoUrl = identity.picture ?? (typeof args.photoUrl === "string" ? args.photoUrl.slice(0, 2048) : undefined);

    let user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      const byUid = await ctx.db
        .query("users")
        .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", identity.firebaseUid))
        .unique();
      if (byUid) {
        await ctx.db.patch(byUid._id, { tokenIdentifier: identity.tokenIdentifier });
        user = await ctx.db.get(byUid._id);
      }
    }

    if (!user) {
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        firebaseUid: identity.firebaseUid,
        tokenIdentifier: identity.tokenIdentifier,
        email,
        displayName,
        photoUrl,
        createdAt: now,
        trialStartedAt: now,
        trialEndsAt: now + 14 * 24 * 60 * 60 * 1000,
      });
      user = await ctx.db.get(userId);
    } else {
      const patch: Record<string, string> = {};
      if (email !== undefined && !user.email) patch.email = email;
      if (displayName !== undefined && !user.displayName) patch.displayName = displayName;
      if (photoUrl !== undefined && !user.photoUrl) patch.photoUrl = photoUrl;
      if (Object.keys(patch).length > 0) await ctx.db.patch(user._id, patch);
    }

    let prefs = await ctx.db
      .query("preferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!prefs) {
      await ctx.db.insert("preferences", {
        tokenIdentifier: identity.tokenIdentifier,
        galleryPermission: "UNDETERMINED",
        onboardingCompleted: false,
        updatedAt: Date.now(),
      });
      prefs = await ctx.db
        .query("preferences")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
    }

    return {
      userId: user!._id,
      firebaseUid: identity.firebaseUid,
      displayName: user!.displayName,
      email: user!.email,
      photoUrl: user!.photoUrl,
      onboardingCompleted: prefs!.onboardingCompleted === true,
    };
  },
});

/** The authenticated caller's complete account state (users + preferences). */
export const meWithPreferences = query({
  args: {},
  returns: v.union(
    v.object({
      user: v.union(
        v.object({
          _id: v.id("users"),
          firebaseUid: v.string(),
          email: v.optional(v.string()),
          displayName: v.optional(v.string()),
          photoUrl: v.optional(v.string()),
          createdAt: v.number(),
        }),
        v.null(),
      ),
      preferences: v.union(
        v.object({
          galleryPermission: v.string(),
          onboardingCompleted: v.boolean(),
        }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return {
      user: {
        _id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
      },
      preferences: {
        galleryPermission: prefs?.galleryPermission ?? "UNDETERMINED",
        onboardingCompleted: prefs?.onboardingCompleted === true,
      },
    };
  },
});

/**
 * Update only the caller's own preferences (partial patch). The preferences
 * row is established exclusively by users.bootstrap; this fails loudly if it
 * has not run, rather than silently creating a divergent row.
 */
export const updatePreferences = mutation({
  args: {
    galleryPermission: v.optional(v.union(v.literal("UNDETERMINED"), v.literal("GRANTED"), v.literal("DENIED"))),
    theme: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
    onboardingCompleted: v.optional(v.boolean()),
    locationEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!prefs) throw new Error("Preferences not initialized; call users.bootstrap first.");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(prefs._id, patch);
    return null;
  },
});

export const ensureUser = internalMutation({
  args: profileArgs,
  returns: v.id("users"),
  handler: (ctx, args) => ensureUserForIdentity(ctx, args),
});

export const connectCoinbaseWallet = mutation({
  args: { address: v.string(), network: v.literal("base") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    if (!/^0x[a-fA-F0-9]{40}$/.test(args.address)) throw new Error("A valid Base wallet address is required.");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("Profile not found.");
    await ctx.db.patch(user._id, {
      coinbaseWalletAddress: args.address,
      walletNetwork: args.network,
      walletConnectedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    photoUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!existing) throw new Error("Profile not found.");
    await ctx.db.patch("users", existing._id, {
      displayName: args.displayName.trim() || identity.firebaseUid,
      photoUrl: args.photoUrl,
    });
    return null;
  },
});

export const getEntitlement = query({
  args: {},
  returns: v.object({
    tier: v.string(),
    trialActive: v.boolean(),
    trialEndsAt: v.optional(v.number()),
    autoRenewDate: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("Profile not found.");
    // Entitlement state is derived from the verified trial window. A real
    // subscription tier can only be written by verified payment reconciliation
    // (Stripe webhook) — never by a client call.
    const trialActive = user.trialEndsAt !== undefined && Date.now() < user.trialEndsAt;
    return {
      tier: "VIP Member",
      trialActive,
      ...(user.trialEndsAt === undefined ? {} : { trialEndsAt: user.trialEndsAt }),
      ...(user.trialEndsAt === undefined
        ? {}
        : { autoRenewDate: new Date(user.trialEndsAt).toISOString() }),
    };
  },
});

type DeletionPhase = (ctx: MutationCtx, tokenIdentifier: string) => Promise<boolean>;

const deletionPhases: DeletionPhase[] = [
  async (ctx, token) => { const rows = await ctx.db.query("preferences").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("preferences", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("savedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("savedProducts", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("likedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("likedProducts", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("cartItems").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("cartItems", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("wardrobeItems").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("wardrobeItems", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("wardrobeOutfits").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("wardrobeOutfits", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("aiUsage").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("aiUsage", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("mediaJobs").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("mediaJobs", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("paymentMethods").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("paymentMethods", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("mediaAssets").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("mediaAssets", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("checkoutAttempts").withIndex("by_token_identifier_and_idempotency_key", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("checkoutAttempts", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("travelEvents").withIndex("by_token_identifier_and_trip", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("travelEvents", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("travelExpenses").withIndex("by_token_identifier_and_trip", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("travelExpenses", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("travelVoiceNotes").withIndex("by_token_identifier_and_trip", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("travelVoiceNotes", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("travelTrips").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("travelTrips", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("groceryItems").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("groceryItems", row._id); return rows.length > 0; },
  async (ctx, token) => { const rows = await ctx.db.query("interactionEvents").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", token)).take(50); for (const row of rows) await ctx.db.delete("interactionEvents", row._id); return rows.length > 0; },
];

export const requestAccountDeletion = mutation({
  args: {},
  returns: v.id("accountDeletionOperations"),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("accountDeletionOperations")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .first();
    if (existing && (existing.status === "QUEUED" || existing.status === "RUNNING")) return existing._id;
    const now = Date.now();
    const operationId = await ctx.db.insert("accountDeletionOperations", {
      tokenIdentifier: identity.tokenIdentifier,
      status: "QUEUED",
      phase: 0,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.users.processAccountDeletion, { operationId });
    return operationId;
  },
});

export const getAccountDeletion = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("accountDeletionOperations"),
      _creationTime: v.number(),
      status: v.union(v.literal("QUEUED"), v.literal("RUNNING"), v.literal("COMPLETED"), v.literal("FAILED")),
      phase: v.number(),
      attempts: v.number(),
      lastError: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const operation = await ctx.db
      .query("accountDeletionOperations")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .first();
    if (!operation) return null;
    const { tokenIdentifier: _tokenIdentifier, ...publicOperation } = operation;
    return publicOperation;
  },
});

export const processAgentAccountDeletion = internalAction({
  args: {
    operationId: v.id("accountDeletionOperations"),
    tokenIdentifier: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await ctx.runAction(components.agent.users.deleteAllForUserId, { userId: args.tokenIdentifier });
      await ctx.runMutation(internal.users.completeAccountDeletion, { operationId: args.operationId });
    } catch (error) {
      await ctx.runMutation(internal.users.failAccountDeletion, {
        operationId: args.operationId,
        message: error instanceof Error ? error.message : "Agent account cleanup failed.",
      });
    }
    return null;
  },
});

export const completeAccountDeletion = internalMutation({
  args: { operationId: v.id("accountDeletionOperations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status === "COMPLETED") return null;
    await ctx.db.patch(args.operationId, { status: "COMPLETED", updatedAt: Date.now() });
    return null;
  },
});

export const failAccountDeletion = internalMutation({
  args: { operationId: v.id("accountDeletionOperations"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status === "COMPLETED") return null;
    await ctx.db.patch(args.operationId, {
      status: "FAILED",
      lastError: args.message.slice(0, 500),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const processAccountDeletion = internalMutation({
  args: { operationId: v.id("accountDeletionOperations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status === "COMPLETED" || operation.phase > deletionPhases.length) return null;
    const now = Date.now();
    await ctx.db.patch(args.operationId, { status: "RUNNING", attempts: operation.attempts + 1, updatedAt: now });

    try {
      const phase = deletionPhases[operation.phase];
      if (phase) {
        const hadRows = await phase(ctx, operation.tokenIdentifier);
        if (hadRows) {
          await ctx.scheduler.runAfter(0, internal.users.processAccountDeletion, { operationId: args.operationId });
          return null;
        }
        await ctx.db.patch(args.operationId, { phase: operation.phase + 1, updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, internal.users.processAccountDeletion, { operationId: args.operationId });
        return null;
      }

      // The Agent component owns its own tables and exposes an action for
      // bounded deletion. Remove application rows now, then let that action
      // clean the component and mark the operation complete.
      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", operation.tokenIdentifier))
        .unique();
      if (user) await ctx.db.delete("users", user._id);
      await ctx.db.patch(args.operationId, { phase: deletionPhases.length + 1, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.users.processAgentAccountDeletion, {
        operationId: args.operationId,
        tokenIdentifier: operation.tokenIdentifier,
      });
      return null;
    } catch (error) {
      await ctx.db.patch(args.operationId, {
        status: "FAILED",
        lastError: error instanceof Error ? error.message.slice(0, 500) : "Account deletion failed.",
        updatedAt: Date.now(),
      });
      return null;
    }
  },
});

/** Backward-compatible entry point: starts durable deletion rather than doing a large transaction. */
export const deactivateAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("accountDeletionOperations")
      .withIndex("by_token_identifier_and_status", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier).eq("status", "QUEUED"))
      .first();
    if (!existing) {
      const now = Date.now();
      const operationId = await ctx.db.insert("accountDeletionOperations", {
        tokenIdentifier: identity.tokenIdentifier,
        status: "QUEUED",
        phase: 0,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.users.processAccountDeletion, { operationId });
    }
    return null;
  },
});
