package auth

/**
 * Root application state machine (auth correction scope).
 *
 * A Firebase session ALONE is never enough to render authenticated Spresso.
 * The required sequence is:
 *
 *   Firebase authenticated → Convex token accepted → canonical bootstrap
 *   succeeds → authenticated product UI (Ready / NeedsOnboarding).
 *
 * Inputs come from their single sources of truth:
 *  - [FirebaseSnapshot]: FirebaseAuth (user presence + email verification).
 *  - [ConvexSessionSnapshot]: the ConvexClientWithAuth authState flow.
 *  - [AccountLaunchState]: the result of the canonical users.bootstrap call.
 *
 * Firebase is the ONLY authority for verification state (no second mutable
 * emailVerified anywhere in Convex). Convex ownership of durable user state
 * begins only after its session is Authenticated.
 */
sealed interface RootAuthState {
    /** Initial Firebase resolution (cold start). */
    data object ResolvingFirebase : RootAuthState

    /** No Firebase session: AuthPage. */
    data object SignedOut : RootAuthState

    /** Firebase signed in; pushing the token into the Convex session. */
    data object AuthenticatingConvex : RootAuthState

    /** Convex session Authenticated; the canonical bootstrap is running. */
    data object BootstrappingUser : RootAuthState

    /** Authenticated, but the email/password account is not verified yet. */
    data class EmailVerificationRequired(val email: String?) : RootAuthState

    /** Bootstrap succeeded; onboarding has not been completed. */
    data class NeedsOnboarding(val launch: AccountLaunchState) : RootAuthState

    /** Fully authenticated product UI. */
    data class Ready(val launch: AccountLaunchState) : RootAuthState

    /** Unrecoverable auth failure surfaced to the user with a retry. */
    data class AuthError(val message: String, val canRetry: Boolean) : RootAuthState
}

/** Firebase-side facts (platform actual). */
data class FirebaseSnapshot(
    val uid: String?,
    val isEmailPasswordProvider: Boolean,
    val isEmailVerified: Boolean,
    val displayName: String?,
    val email: String?,
)

/** Convex client session state (from ConvexClientWithAuth.authState + socket state). */
sealed interface ConvexSessionSnapshot {
    data object Unauthenticated : ConvexSessionSnapshot
    data object Authenticating : ConvexSessionSnapshot
    data object Authenticated : ConvexSessionSnapshot
    /** Transport temporarily down (WebSocket reconnecting / network offline)
     *  while the authenticated identity is still valid. NOT an auth failure. */
    data object Refreshing : ConvexSessionSnapshot
}

/**
 * Pure transition: the current root state plus the newest input snapshot
 * produces the next root state. Deterministic and unit-testable; consumed by
 * AuthCoordinator (which threads the running current state) and directly by
 * platform hosts that compose inputs themselves.
 */
fun reduceRootAuthState(
    current: RootAuthState,
    firebase: FirebaseSnapshot,
    convex: ConvexSessionSnapshot,
    launch: AccountLaunchState?,
    bootstrapError: String?,
): RootAuthState {
    if (firebase.uid == null) return RootAuthState.SignedOut
    if (firebase.isEmailPasswordProvider && !firebase.isEmailVerified) {
        return RootAuthState.EmailVerificationRequired(firebase.email)
    }

    val ready: (AccountLaunchState) -> RootAuthState = { result ->
        if (result.onboardingCompleted) RootAuthState.Ready(result) else RootAuthState.NeedsOnboarding(result)
    }

    return when (convex) {
        ConvexSessionSnapshot.Authenticated -> when (launch) {
            null -> when (bootstrapError) {
                null -> RootAuthState.BootstrappingUser
                else -> RootAuthState.AuthError(bootstrapError, canRetry = true)
            }
            else -> ready(launch)
        }
        ConvexSessionSnapshot.Authenticating -> RootAuthState.AuthenticatingConvex
        ConvexSessionSnapshot.Refreshing ->
            // Temporary transport loss (WebSocket reconnect / offline): a valid
            // Firebase identity with previously-authenticated Convex state HOLDS
            // its position — reconnect is not an authentication failure, and the
            // user must not be bounced to Auth. Without prior Convex auth, wait.
            when {
                launch != null -> current
                current is RootAuthState.BootstrappingUser -> RootAuthState.BootstrappingUser
                else -> RootAuthState.AuthenticatingConvex
            }
        ConvexSessionSnapshot.Unauthenticated ->
            // Convex explicitly lost its authenticated session while Firebase is
            // signed in (e.g. token rejected and refresh unavailable): a real
            // authentication failure — recoverable by re-sign-in, not silent.
            if (current is RootAuthState.BootstrappingUser || current is RootAuthState.Ready || current is RootAuthState.NeedsOnboarding) {
                RootAuthState.AuthError("Your session ended. Sign in again.", canRetry = false)
            } else {
                RootAuthState.AuthenticatingConvex
            }
    }
}
