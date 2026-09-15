import { z } from "zod";
import { action, env, internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireFirebaseIdentity } from "./lib/identity";
import { sanitizeUntrustedText } from "./ai/guardrails";
import { configuredLlmModel } from "./ai/model";
import { convexGateway } from "@convex-dev/ai-sdk-provider";
import { generateText } from "ai";
import { BunnyMediaStore, assertOwnedPrivateMediaKey, bunnyConfigFromEnv } from "./media/bunnyStore";
import { v } from "convex/values";

/**
 * Travel domain — the single Convex owner of trips, itinerary events,
 * expenses, and voice notes.
 *
 * Every row is owner-scoped; nested collections hang off `tripId` with
 * composite indexes so a trip detail read is three bounded indexed queries.
 * Voice-note audio and receipt images live behind the private Bunny media
 * boundary (media keys only in rows), never Firebase Storage. Legacy
 * Firebase/Data Connect rows are imported through `seedFromLegacy`.
 */

const tripStatus = v.union(
  v.literal("UPCOMING"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED"),
);

const expenseCategory = v.union(
  v.literal("Dining"),
  v.literal("Flight"),
  v.literal("Hotel"),
  v.literal("Shopping"),
  v.literal("Transport"),
  v.literal("Activities"),
  v.literal("Other"),
);

const eventType = v.union(
  v.literal("flight"),
  v.literal("hotel"),
  v.literal("restaurant"),
  v.literal("tour"),
  v.literal("ticket"),
);

const tripRow = v.object({
  id: v.id("travelTrips"),
  title: v.string(),
  destination: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  status: tripStatus,
  coverImage: v.optional(v.string()),
  budgetTotal: v.optional(v.number()),
});

async function requireOwnedTrip(ctx: QueryCtx, tripId: Id<"travelTrips">, tokenIdentifier: string): Promise<Doc<"travelTrips">> {
  const trip = await ctx.db.get(tripId);
  if (!trip || trip.tokenIdentifier !== tokenIdentifier) {
    throw new Error("Trip not found for this user.");
  }
  return trip;
}

export const listTrips = query({
  args: {},
  returns: v.object({ trips: v.array(tripRow) }),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const rows = await ctx.db
      .query("travelTrips")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("asc")
      .take(100);
    return {
      trips: rows.map((row) => ({
        id: row._id,
        title: row.title,
        destination: row.destination,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        ...(row.coverImage ? { coverImage: row.coverImage } : {}),
        ...(row.budgetTotal !== undefined ? { budgetTotal: row.budgetTotal } : {}),
      })),
    };
  },
});

export const listTripDetail = query({
  args: { tripId: v.id("travelTrips") },
  returns: v.object({
    events: v.array(v.object({
      id: v.id("travelEvents"),
      type: eventType,
      title: v.string(),
      description: v.string(),
      eventTime: v.string(),
      location: v.string(),
      price: v.optional(v.number()),
      qrData: v.optional(v.string()),
      confirmationCode: v.optional(v.string()),
      gate: v.optional(v.string()),
      seat: v.optional(v.string()),
    })),
    expenses: v.array(v.object({
      id: v.id("travelExpenses"),
      amount: v.number(),
      currency: v.string(),
      category: expenseCategory,
      merchant: v.string(),
      date: v.string(),
      items: v.optional(v.array(v.object({ name: v.string(), price: v.number() }))),
    })),
    voiceNotes: v.array(v.object({
      id: v.id("travelVoiceNotes"),
      transcript: v.string(),
      audioMediaKey: v.optional(v.string()),
      createdAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await requireOwnedTrip(ctx, args.tripId, identity.tokenIdentifier);

    const events = await ctx.db
      .query("travelEvents")
      .withIndex("by_token_identifier_and_trip", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("tripId", args.tripId))
      .order("asc")
      .take(200);
    const expenses = await ctx.db
      .query("travelExpenses")
      .withIndex("by_token_identifier_and_trip", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("tripId", args.tripId))
      .order("desc")
      .take(500);
    const voiceNotes = await ctx.db
      .query("travelVoiceNotes")
      .withIndex("by_token_identifier_and_trip", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("tripId", args.tripId))
      .order("desc")
      .take(100);

    return {
      events: events.map((row) => ({
        id: row._id,
        type: row.type,
        title: row.title,
        description: row.description,
        eventTime: row.eventTime,
        location: row.location,
        ...(row.price !== undefined ? { price: row.price } : {}),
        ...(row.qrData ? { qrData: row.qrData } : {}),
        ...(row.confirmationCode ? { confirmationCode: row.confirmationCode } : {}),
        ...(row.gate ? { gate: row.gate } : {}),
        ...(row.seat ? { seat: row.seat } : {}),
      })),
      expenses: expenses.map((row) => ({
        id: row._id,
        amount: row.amount,
        currency: row.currency,
        category: row.category,
        merchant: row.merchant,
        date: row.date,
        ...(row.items ? { items: row.items } : {}),
      })),
      voiceNotes: voiceNotes.map((row) => ({
        id: row._id,
        transcript: row.transcript,
        ...(row.audioMediaKey ? { audioMediaKey: row.audioMediaKey } : {}),
        createdAt: row.createdAt,
      })),
    };
  },
});

export const addExpense = mutation({
  args: {
    tripId: v.id("travelTrips"),
    amount: v.number(),
    currency: v.string(),
    category: expenseCategory,
    merchant: v.string(),
    date: v.optional(v.string()),
    items: v.optional(v.array(v.object({ name: v.string(), price: v.number() }))),
  },
  returns: v.id("travelExpenses"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await requireOwnedTrip(ctx, args.tripId, identity.tokenIdentifier);
    if (!Number.isFinite(args.amount) || args.amount < 0 || args.amount > 1_000_000) {
      throw new Error("A valid expense amount is required.");
    }
    if (!/^[A-Za-z]{3}$/.test(args.currency)) throw new Error("A valid currency code is required.");
    const merchant = args.merchant.trim();
    if (!merchant || merchant.length > 200) throw new Error("A merchant name is required.");
    return ctx.db.insert("travelExpenses", {
      tokenIdentifier: identity.tokenIdentifier,
      tripId: args.tripId,
      amount: args.amount,
      currency: args.currency.toUpperCase(),
      category: args.category,
      merchant,
      date: args.date?.trim() || new Date().toISOString().split("T")[0],
      ...(args.items ? { items: args.items } : {}),
      createdAt: Date.now(),
    });
  },
});

export const createVoiceNote = mutation({
  args: {
    tripId: v.id("travelTrips"),
    transcript: v.string(),
    /** Optional Bunny media key of the recording, if audio was captured. */
    audioMediaKey: v.optional(v.string()),
  },
  returns: v.id("travelVoiceNotes"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await requireOwnedTrip(ctx, args.tripId, identity.tokenIdentifier);
    const transcript = args.transcript.trim();
    if (!transcript || transcript.length > 4000) throw new Error("A transcript is required.");
    if (args.audioMediaKey) {
      assertOwnedPrivateMediaKey(identity.firebaseUid, args.audioMediaKey);
      const asset = await ctx.db
        .query("mediaAssets")
        .withIndex("by_token_identifier_and_media_key", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier).eq("mediaKey", args.audioMediaKey!))
        .unique();
      if (!asset) throw new Error("Audio asset not found for this user.");
    }
    return ctx.db.insert("travelVoiceNotes", {
      tokenIdentifier: identity.tokenIdentifier,
      tripId: args.tripId,
      transcript,
      ...(args.audioMediaKey ? { audioMediaKey: args.audioMediaKey } : {}),
      createdAt: Date.now(),
    });
  },
});

const ParsedReceiptSchema = z.object({
  merchantName: z.string().max(200).nullable(),
  purchaseDate: z.string().max(40).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  total: z.number().nonnegative().nullable(),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().positive().max(100).default(1),
    amount: z.number().nonnegative().nullable(),
  }).strict()).max(100),
}).strict();

export const parseReceiptImage = action({
  args: {
    /** Owner-scoped Bunny media key of the receipt photo. */
    receiptMediaKey: v.string(),
  },
  returns: v.object({
    merchantName: v.union(v.string(), v.null()),
    purchaseDate: v.union(v.string(), v.null()),
    currency: v.union(v.string(), v.null()),
    total: v.union(v.number(), v.null()),
    items: v.array(v.object({ name: v.string(), quantity: v.number(), amount: v.union(v.number(), v.null()) })),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    assertOwnedPrivateMediaKey(identity.firebaseUid, args.receiptMediaKey);
    const asset = await ctx.runQuery(internal.media.getOwnedAssetByKey, {
      mediaKey: args.receiptMediaKey,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!asset) throw new Error("Receipt image not found for this user.");

    const store = new BunnyMediaStore(bunnyConfigFromEnv(env));
    const bytes = await store.getPrivateBytes(args.receiptMediaKey);
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Receipt image is too large.");

    try {
      const { text } = await generateText({
        model: convexGateway(configuredLlmModel()),
        messages: [{
          role: "user" as const,
          content: [
            { type: "image" as const, image: new Uint8Array(bytes) },
            { type: "text" as const, text: "Extract this receipt into JSON with merchantName, purchaseDate, currency, total, and items. Use null when unreadable. Never infer missing prices." },
          ],
        }],
        maxOutputTokens: 1200,
        maxRetries: 1,
      });
      const parsed = ParsedReceiptSchema.parse(JSON.parse(text));
      return parsed;
    } catch (cause) {
      if (cause instanceof z.ZodError) throw new Error("Receipt parsing returned malformed content.");
      if (cause instanceof Error && cause.message.startsWith("Receipt parsing")) throw cause;
      throw new Error(`Receipt parsing is temporarily unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  },
});

/**
 * Idempotent migration seed for the Firebase/Data Connect travel data,
 * keyed by legacy document id. Callable only via `npx convex run`.
 */
export const seedFromLegacy = internalMutation({
  args: {
    trips: v.array(v.object({
      legacyId: v.string(),
      title: v.string(),
      destination: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      status: tripStatus,
      coverImage: v.optional(v.string()),
      budgetTotal: v.optional(v.number()),
      tokenIdentifier: v.string(),
    })),
    events: v.optional(v.array(v.object({
      legacyId: v.string(),
      legacyTripId: v.string(),
      type: eventType,
      title: v.string(),
      description: v.string(),
      eventTime: v.string(),
      location: v.string(),
      price: v.optional(v.number()),
      qrData: v.optional(v.string()),
      confirmationCode: v.optional(v.string()),
      gate: v.optional(v.string()),
      seat: v.optional(v.string()),
    }))),
    expenses: v.optional(v.array(v.object({
      legacyId: v.string(),
      legacyTripId: v.string(),
      amount: v.number(),
      currency: v.string(),
      category: expenseCategory,
      merchant: v.string(),
      date: v.string(),
    }))),
    voiceNotes: v.optional(v.array(v.object({
      legacyId: v.string(),
      legacyTripId: v.string(),
      transcript: v.string(),
      createdAt: v.number(),
    }))),
  },
  returns: v.object({ trips: v.number(), events: v.number(), expenses: v.number(), voiceNotes: v.number() }),
  handler: async (ctx, args) => {
    // Legacy trips must already resolve to a Spresso identity; the caller
    // supplies the tokenIdentifier mapped from the Firebase UID.
    async function upsertByLegacyId(
      table: "travelTrips" | "travelEvents" | "travelExpenses" | "travelVoiceNotes",
      legacyId: string,
      values: Record<string, unknown>,
    ): Promise<void> {
      const existing = await ctx.db
        .query(table)
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId))
        .unique();
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert(table, { legacyId, ...values } as never);
    }

    const tripIdByLegacy = new Map<string, { id: string; tokenIdentifier: string }>();
    for (const row of args.trips) {
      const { legacyId, ...values } = row;
      await upsertByLegacyId("travelTrips", legacyId, values);
      const created = await ctx.db
        .query("travelTrips")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId))
        .unique();
      tripIdByLegacy.set(legacyId, { id: created!._id, tokenIdentifier: row.tokenIdentifier });
    }

    const resolveTrip = (legacyTripId: string, tokenIdentifier: string) => {
      const trip = tripIdByLegacy.get(legacyTripId);
      if (!trip) throw new Error(`Seed references unknown legacy trip ${legacyTripId}.`);
      if (trip.tokenIdentifier !== tokenIdentifier) throw new Error("Seed rows mix owners across trips.");
      return trip.id;
    };

    let eventCount = 0;
    for (const row of args.events ?? []) {
      const { legacyId, legacyTripId, ...values } = row;
      const trip = tripIdByLegacy.get(legacyTripId);
      if (!trip) throw new Error(`Seed references unknown legacy trip ${legacyTripId}.`);
      await upsertByLegacyId("travelEvents", legacyId, {
        ...values,
        tripId: trip.id,
        tokenIdentifier: trip.tokenIdentifier,
      });
      eventCount++;
    }
    let expenseCount = 0;
    for (const row of args.expenses ?? []) {
      const { legacyId, legacyTripId, ...values } = row;
      const trip = tripIdByLegacy.get(legacyTripId);
      if (!trip) throw new Error(`Seed references unknown legacy trip ${legacyTripId}.`);
      await upsertByLegacyId("travelExpenses", legacyId, {
        ...values,
        tripId: trip.id,
        tokenIdentifier: trip.tokenIdentifier,
        createdAt: Date.now(),
      });
      expenseCount++;
    }
    let voiceNoteCount = 0;
    for (const row of args.voiceNotes ?? []) {
      const { legacyId, legacyTripId, ...values } = row;
      const trip = tripIdByLegacy.get(legacyTripId);
      if (!trip) throw new Error(`Seed references unknown legacy trip ${legacyTripId}.`);
      await upsertByLegacyId("travelVoiceNotes", legacyId, {
        ...values,
        tripId: trip.id,
        tokenIdentifier: trip.tokenIdentifier,
      });
      voiceNoteCount++;
    }
    void resolveTrip;
    return { trips: args.trips.length, events: eventCount, expenses: expenseCount, voiceNotes: voiceNoteCount };
  },
});
