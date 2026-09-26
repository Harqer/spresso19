package auth

import kotlinx.coroutines.flow.StateFlow

/**
 * Common semantic identity contract (KMP Firebase + Convex boundary).
 *
 * The shared application owns authentication STATE contracts; platform source
 * sets supply the actual Firebase bindings. No platform may downgrade or omit
 * this contract: every supported target exposes the same normalized identity
 * session, whether the underlying SDK is Firebase Android, the Firebase Apple
 * SDK, or Firebase Web.
 *
 * The absence of a first-party Convex SDK consumable from commonMain is an
 * implementation-detail constraint, not an authentication limitation: each
 * platform adapts its own Firebase/Convex clients beneath [SpressoBackend],
 * and all of them converge on the same deployment, the same
 * convex/auth.config.ts validation, and the same `users.bootstrap` mutation.
 *
 * Failure taxonomy (auth remediation §34): distinct recoveries — never
 * collapse these into SignedOut.
 */
sealed interface IdentityFailure {
    /** Firebase sign-in attempt failed (bad credential, network, provider). */
    data class FirebaseSignInFailed(val reason: String?) : IdentityFailure
    /** A security-sensitive operation needs recent Firebase reauthentication. */
    data object FirebaseReauthenticationRequired : IdentityFailure
    /** Firebase could not produce an ID token for the current session. */
    data object FirebaseTokenUnavailable : IdentityFailure
}

/**
 * Normalized Firebase identity state, identical on every platform.
 * `firebaseUid == null` means no Firebase session (SignedOut).
 */
data class IdentitySession(
    val firebaseUid: String?,
    val email: String?,
    val displayName: String?,
    val photoUrl: String?,
    /** Firebase-owned truth: email/password accounts may be unverified. */
    val isEmailPasswordProvider: Boolean,
    val isEmailVerified: Boolean,
    /** Present only when the last state change was a failure. */
    val failure: IdentityFailure? = null,
) {
    val isSignedIn: Boolean get() = firebaseUid != null

    companion object {
        val SignedOut = IdentitySession(
            firebaseUid = null, email = null, displayName = null, photoUrl = null,
            isEmailPasswordProvider = false, isEmailVerified = false,
        )
    }
}

/**
 * Platform adapter factory: each source set supplies its backend adapter over
 * the platform Convex client (Android: official ConvexClientWithAuth; web:
 * compatibility transport over the same canonical mutations; iOS: Swift
 * client adapter).
 */
expect fun provideSpressoBackend(): SpressoBackend

/** Normalized launch state from the canonical `users.bootstrap` mutation. */
typealias LaunchState = AccountLaunchState

/**
 * Common semantic backend contract. Platform adapters implement this over the
 * platform Convex client (Android: official ConvexClientWithAuth + Firebase
 * AuthProvider; web: compatibility HTTP bridge running the same canonical
 * mutations until the native Convex JS adapter lands; iOS: Swift client
 * adapter). All adapters hit the same Convex deployment and the same
 * `users.bootstrap` mutation.
 */
interface SpressoBackend {
    /** Authenticated session state of the platform Convex client. */
    val sessionState: StateFlow<BackendSessionSnapshot>

    /** One idempotent canonical bootstrap; returns the typed launch state. */
    suspend fun bootstrap(displayName: String?, email: String?, photoUrl: String?): AccountLaunchState
}

/** Discriminated union for exhaustive state matching without nullable juggling. */
sealed interface BackendSessionSnapshot {
    data object Unauthenticated : BackendSessionSnapshot
    data object Authenticating : BackendSessionSnapshot
    data object Authenticated : BackendSessionSnapshot
    data object Refreshing : BackendSessionSnapshot
}
