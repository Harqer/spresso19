import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

/**
 * CVX-001 identity boundary.
 *
 * Every privileged Convex function derives the caller's identity server-side
 * via `ctx.auth.getUserIdentity()` — never from arguments. The Firebase issuer
 * is pinned here because Convex's auth.config.ts `domain` check alone does not
 * prevent an identity minted by a *different* configured provider from being
 * treated as a Firebase user.
 *
 * Per Convex guidelines, `tokenIdentifier` is the canonical stable identifier
 * for an authenticated identity; `subject` (the Firebase UID) is kept as the
 * app-level key that all clients and migrated data already use.
 */

const FIREBASE_ISSUER = "https://securetoken.google.com/get-spresso";

export type FirebaseIdentity = {
  /** Firebase UID — the canonical subject across the whole platform. */
  firebaseUid: string;
  /** Convex-verified canonical identity key. */
  tokenIdentifier: string;
  issuer: string;
  /** Verified token claims (Firebase-owned profile metadata). Present only
   *  when the ID token carries them; NEVER client-supplied. */
  email?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
};

type IdentityCtx = {
  auth: {
    getUserIdentity(): Promise<{
      subject: string;
      issuer: string;
      tokenIdentifier: string;
      email?: string;
      name?: string;
      picture?: string;
      emailVerified?: boolean;
    } | null>;
  };
};

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Require an authenticated Firebase identity or throw.
 * Rejects missing identities, non-Firebase issuers, and empty subjects.
 */
export async function requireFirebaseIdentity(ctx: AnyCtx): Promise<FirebaseIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: sign in required.");
  }
  if (identity.issuer !== FIREBASE_ISSUER) {
    throw new Error("Unauthenticated: unsupported identity issuer.");
  }
  if (!identity.subject || !identity.tokenIdentifier) {
    throw new Error("Unauthenticated: malformed identity.");
  }
  return {
    firebaseUid: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    issuer: identity.issuer,
    // Standard Firebase ID-token claims (firebase claim + verified profile).
    email: typeof identity.email === "string" ? identity.email : undefined,
    name: typeof identity.name === "string" ? identity.name : undefined,
    picture: typeof identity.picture === "string" ? identity.picture : undefined,
    emailVerified: identity.emailVerified === true,
  };
}

/**
 * Optional identity for public read paths (discovery surfaces): returns null
 * for anonymous callers instead of throwing, but still rejects non-Firebase
 * issuers so a foreign identity can never masquerade as a Spresso user.
 */
export async function getOptionalFirebaseIdentity(ctx: AnyCtx): Promise<FirebaseIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  if (identity.issuer !== FIREBASE_ISSUER) {
    throw new Error("Unauthenticated: unsupported identity issuer.");
  }
  if (!identity.subject || !identity.tokenIdentifier) {
    return null;
  }
  return {
    firebaseUid: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    issuer: identity.issuer,
    email: typeof identity.email === "string" ? identity.email : undefined,
    name: typeof identity.name === "string" ? identity.name : undefined,
    picture: typeof identity.picture === "string" ? identity.picture : undefined,
    emailVerified: identity.emailVerified === true,
  };
}
