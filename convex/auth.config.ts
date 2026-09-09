import type { AuthConfig } from "convex/server";

/**
 * CVX-001: Firebase Authentication as the sole identity provider.
 *
 * Convex validates Firebase ID tokens against this configuration:
 * - `domain` must exactly match the JWT `iss` claim.
 * - `applicationID` must exactly match the JWT `aud` claim (Firebase ID
 *   tokens carry the project ID as their audience).
 *
 * Verified live against
 * https://securetoken.google.com/get-spresso/.well-known/openid-configuration
 * (issuer + RS256 JWKS discovery) on 2026-09-08.
 *
 * A wrong value here is the "silently always signed out" footgun: identity
 * checks return null without any error. The identity test suite pins these
 * exact strings for that reason.
 *
 * Spresso deliberately does NOT adopt @convex-dev/auth: Firebase Auth remains
 * the identity system of record (including passkey step-up MFA design).
 */
export default {
  providers: [
    {
      domain: "https://securetoken.google.com/get-spresso",
      applicationID: "get-spresso",
    },
  ],
} satisfies AuthConfig;
