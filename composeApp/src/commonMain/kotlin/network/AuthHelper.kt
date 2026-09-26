package network

import auth.IdentitySession
import kotlinx.coroutines.flow.Flow

/** Returns the currently authenticated Firebase user's UID, or null if not signed in. */
expect fun getCurrentUserUid(): String?

/**
 * Normalized Firebase identity session flow (KMP contract). Each platform
 * adapts its SDK's listener surface: Android FirebaseAuth.IdTokenListener,
 * web Firebase onAuthStateChanged; the flow emits the current [IdentitySession]
 * on every sign-in/sign-out/refresh-driven change.
 */
expect val identitySessionFlow: Flow<IdentitySession>

/** Returns a short-lived Firebase ID token for authenticated server requests. */
expect suspend fun getCurrentUserIdToken(): String?

/** Signs out the current user. */
expect fun signOut()

/** Signs in with email and password */
expect suspend fun signInWithEmailAndPassword(
    email: String,
    password: String,
): Boolean

/** Creates a new user with email and password, setting the Firebase displayName */
expect suspend fun createUserWithEmailAndPassword(
    email: String,
    password: String,
    displayName: String?,
): Boolean

/** Sends the Firebase password-reset email; no Convex involvement. */
expect suspend fun sendPasswordResetEmail(email: String): Boolean

/** Sends verification email for the authenticated user. */
expect suspend fun sendEmailVerification(): Boolean

/** Reloads the Firebase user so email-verification state re-evaluates. */
expect suspend fun reloadCurrentUser(): Boolean

/** Deletes the Firebase identity after the Convex deletion operation is queued. */
expect suspend fun deleteCurrentUserIdentity(): Boolean
