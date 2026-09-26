package auth

/**
 * Canonical account bootstrap transport (auth correction §28).
 *
 * Common contract, platform actuals:
 *  - Android: the official ConvexClientWithAuth session (SpressoApp) calls the
 *    `users.bootstrap` Convex mutation directly — no HTTP involved. The
 *    Convex-verified Firebase identity is authoritative; the client sends no
 *    identifiers.
 *  - Web (wasmJs): the authenticated HTTP bridge is the CURRENT COMPATIBILITY
 *    TRANSPORT (not an ingress requirement): it runs the SAME canonical
 *    `users.bootstrap` mutation server-side. The native Convex JS client
 *    (setAuth with the Firebase ID token) is the end-state web transport.
 *
 * Launch state:
 *  - `onboardingCompleted` comes from the idempotent bootstrap's preferences
 *    defaults (galleryPermission UNDETERMINED, onboardingCompleted false).
 *  - The root state machine uses [AccountLaunchState] to move
 *    BootstrappingUser → NeedsOnboarding / Ready. Firebase verification state
 *    stays Firebase-owned.
 */
data class AccountLaunchState(
    val userId: String,
    val firebaseUid: String,
    val displayName: String?,
    val email: String?,
    val photoUrl: String?,
    val onboardingCompleted: Boolean,
)

/** Canonical idempotent bootstrap: one call establishes users + preferences. */
expect suspend fun bootstrapAccount(
    displayName: String? = null,
    email: String? = null,
    photoUrl: String? = null,
): AccountLaunchState
