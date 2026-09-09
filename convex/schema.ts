import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CVX-001 bootstrap schema (2026-09-05 platform-cost-migration, Convex-only revision).
 *
 * Firebase UID is the canonical identity subject: every user-scoped document is
 * keyed by `tokenIdentifier` (the Convex-verified canonical identity key) or
 * `firebaseUid`, never by caller-supplied arguments.
 *
 * Phase-1 tables land as separate tickets (CVX-002 reactive state, CVX-003
 * checkout/passkeys, CVX-004 entitlements); each arrival must follow
 * convex-migration-helper widen/migrate/narrow rules for populated tables.
 */
export default defineSchema({
  users: defineTable({
    // Canonical Firebase subject (Firebase UID).
    firebaseUid: v.string(),
    // Convex tokenIdentifier for the signed-in identity (unique per identity).
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_firebase_uid", ["firebaseUid"])
    .index("by_token_identifier", ["tokenIdentifier"]),
});
