package com.spresso

import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import dev.convex.android.AuthProvider
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Firebase-backed [AuthProvider] for the official Convex Android client
 * (ConvexClientWithAuth). Firebase Authentication is the identity provider;
 * Convex validates the Firebase **Auth ID token** (never an App Check token)
 * against convex/auth.config.ts:
 *
 *   iss = https://securetoken.google.com/get-spresso
 *   aud = get-spresso
 *   sub = Firebase UID
 *
 * Lifecycle (android-convexmobile 0.8.0 contract):
 *  - ONE FirebaseAuth.IdTokenListener registered for the provider lifetime
 *    (covers registration, sign-in, sign-out, current-user change, and token
 *    refresh — an unchanged user can still mint a new token, so the
 *    AuthStateListener alone is NOT sufficient). Unregistered only in
 *    [dispose], when the Convex client itself is disposed.
 *  - Token events translate directly into the 0.8.0 `onIdToken(String?)`
 *    callback: a JWT on every valid token, `null` on sign-out/user-clear.
 *  - Token discipline: the ID token lives only inside the SDK-managed Convex
 *    session (pushed via onIdToken, pulled by the Rust bridge on reconnect).
 *    It is never written to Convex, DataStore, SharedPreferences, files,
 *    logs, or telemetry. Firebase owns the session and its refresh cache —
 *    the application keeps no copy.
 *  - Refresh semantics: ordinary acquisition uses Firebase's current valid
 *    cached token (`getIdToken(false)`); Firebase refreshes it as needed.
 *    Forced minting is reserved for cases requiring new claims (explicit
 *    reauthentication, email-verification completion, claim changes, recovery
 *    after an auth rejection) — see [forceTokenRefresh].
 *  - Reconnect: Convex 0.8.0 calls [loginFromCache] when the WebSocket needs a
 *    fresh token; Firebase's own session IS the cache — nothing is persisted
 *    application-side.
 */
class FirebaseConvexAuthProvider(
    private val firebaseAuth: FirebaseAuth,
) : AuthProvider<FirebaseUser> {
    private var onIdTokenCallback: ((String?) -> Unit)? = null

    /**
     * The single long-lived Firebase listener for this provider's lifecycle.
     * IdTokenListener fires for sign-in, sign-out, user replacement, AND token
     * refresh — translating each event into the Convex client's token bridge.
     */
    private val idTokenListener = FirebaseAuth.IdTokenListener { auth ->
        val user = auth.currentUser
        if (user == null) {
            // Firebase session gone (sign-out or user cleared): Convex must
            // drop its authenticated state.
            onIdTokenCallback?.invoke(null)
            return@IdTokenListener
        }
        // Ordinary path: Firebase's cached, currently-valid token. Firebase
        // itself refreshes against its own clock/skew policy — no force.
        user.getIdToken(false).addOnCompleteListener { task ->
            onIdTokenCallback?.invoke(task.result?.token)
        }
    }

    init {
        firebaseAuth.addIdTokenListener(idTokenListener)
    }

    /** Unregister the listener when the Convex client is disposed. */
    fun dispose() {
        firebaseAuth.removeIdTokenListener(idTokenListener)
        onIdTokenCallback = null
    }

    /**
     * Push the current cached Firebase ID token into the Convex session now
     * (used at process restore, before the first listener event lands).
     */
    suspend fun pushCurrentToken(): Boolean {
        val user = firebaseAuth.currentUser ?: return false
        return suspendCancellableCoroutine { continuation ->
            user.getIdToken(false).addOnCompleteListener { task ->
                val token = task.result?.token
                if (token != null) onIdTokenCallback?.invoke(token)
                if (continuation.isActive) continuation.resume(token != null)
            }
        }
    }

    /**
     * Force-mint a new Firebase ID token (new claims) and push it: explicit
     * reauthentication, email-verification completion, security-sensitive
     * claim changes, or recovery after Convex rejected the previous token.
     */
    suspend fun forceTokenRefresh(): Boolean {
        val user = firebaseAuth.currentUser ?: return false
        return suspendCancellableCoroutine { continuation ->
            user.getIdToken(true).addOnCompleteListener { task ->
                val token = task.result?.token
                if (token != null) onIdTokenCallback?.invoke(token)
                if (continuation.isActive) continuation.resume(token != null)
            }
        }
    }

    /**
     * UI-less re-auth used by Convex 0.8.0 for login and WebSocket reconnect.
     * Firebase's signed-in session is the credential cache; a missing session
     * pushes null so Convex transitions to Unauthenticated.
     */
    override suspend fun loginFromCache(onIdToken: (String?) -> Unit): Result<FirebaseUser> {
        onIdTokenCallback = onIdToken
        val user = firebaseAuth.currentUser
            ?: run {
                onIdToken(null)
                return Result.failure(IllegalStateException("Firebase session is not available."))
            }
        // Minted fresh because a NEW Convex session/socket is being
        // established and 0.8.0 seeds it through extractIdToken; later
        // refreshes flow through the IdTokenListener without forcing.
        return suspendCancellableCoroutine { continuation ->
            user.getIdToken(true).addOnCompleteListener { task ->
                val token = task.result?.token
                if (token == null) {
                    onIdToken(null)
                    if (continuation.isActive) {
                        continuation.resume(Result.failure(IllegalStateException("Firebase did not provide an ID token.")))
                    }
                } else {
                    onIdToken(token)
                    if (continuation.isActive) continuation.resume(Result.success(user))
                }
            }
        }
    }

    /** login(context) is the same session-seeding path: Firebase is already UI-complete. */
    override suspend fun login(context: Context, onIdToken: (String?) -> Unit): Result<FirebaseUser> =
        loginFromCache(onIdToken)

    /**
     * 0.8.0 seeds the bridge with this value at login time. The Firebase Auth
     * ID token is delivered through onIdToken (async by nature), which ALWAYS
     * runs before the login Result resolves, so the bridge already holds the
     * current JWT; the user payload itself never carries tokens.
     */
    override fun extractIdToken(authResult: FirebaseUser): String = authResult.uid

    /** Firebase owns session teardown; the null push clears the Convex side. */
    override suspend fun logout(context: Context): Result<Void?> {
        firebaseAuth.signOut()
        onIdTokenCallback?.invoke(null)
        return Result.success(null)
    }
}
