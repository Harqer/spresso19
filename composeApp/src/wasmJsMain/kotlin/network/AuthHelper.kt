@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package network

import auth.IdentitySession
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.await
import kotlin.js.Promise

external fun getFirebaseUserUid(): String?

/**
 * Registers a Firebase auth-state listener; returns the unsubscribe function.
 * The callback receives an opaque JsAny payload (plain JS object); field
 * access goes through the JsAny helpers below (JS interop restricts external
 * function parameter types).
 */
external fun onAuthStateChanged(callback: (JsAny?) -> Unit): JsAny?

external fun jsFieldString(payload: JsAny?, key: String): String?

external fun jsFieldBoolean(payload: JsAny?, key: String): Boolean?

external fun jsDisposeListener(handle: JsAny?)

external fun getFirebaseUserIdToken(): Promise<JsAny>?

external fun signOutFirebase()

external fun signInWithEmailAndPasswordFirebase(
    email: String,
    password: String,
): Promise<JsAny>

external fun createUserWithEmailAndPasswordFirebase(
    email: String,
    password: String,
    displayName: String?,
): Promise<JsAny>

external fun sendEmailVerificationFirebase(): Promise<JsAny>

external fun sendPasswordResetEmailFirebase(email: String): Promise<JsAny>

external fun reloadCurrentUserFirebase(): Promise<JsAny>

external fun deleteCurrentUserIdentityFirebase(): Promise<JsAny>

@JsName("signInWithGoogle")
external fun triggerGoogleSignIn(): Promise<JsAny?>

actual fun getCurrentUserUid(): String? = getFirebaseUserUid()

actual suspend fun getCurrentUserIdToken(): String? = getFirebaseUserIdToken()?.await<JsAny>()?.toString()

actual fun signOut() {
    signOutFirebase()
}

actual suspend fun signInWithEmailAndPassword(
    email: String,
    password: String,
): Boolean =
    try {
        signInWithEmailAndPasswordFirebase(email, password).await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

actual suspend fun createUserWithEmailAndPassword(
    email: String,
    password: String,
    displayName: String?,
): Boolean =
    try {
        createUserWithEmailAndPasswordFirebase(email, password, displayName).await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

actual suspend fun deleteCurrentUserIdentity(): Boolean =
    try {
        deleteCurrentUserIdentityFirebase().await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

actual suspend fun sendEmailVerification(): Boolean =
    try {
        sendEmailVerificationFirebase().await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

actual suspend fun sendPasswordResetEmail(email: String): Boolean =
    try {
        sendPasswordResetEmailFirebase(email).await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

actual suspend fun reloadCurrentUser(): Boolean =
    try {
        reloadCurrentUserFirebase().await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

/**
 * Normalized identity session for the shared KMP contract, driven by the web
 * Firebase onAuthStateChanged bridge (sign-in, sign-out, token refresh). The
 * unsubscribe handle is invoked via jsDisposeListener by the collector; the
 * page-lifetime bridge otherwise owns the listener.
 */
actual val identitySessionFlow: Flow<IdentitySession> = kotlinx.coroutines.flow.callbackFlow {
    val handle = onAuthStateChanged { payload ->
        val uid = jsFieldString(payload, "uid")
        trySend(
            if (uid == null) {
                IdentitySession.SignedOut
            } else {
                IdentitySession(
                    firebaseUid = uid,
                    email = jsFieldString(payload, "email"),
                    displayName = jsFieldString(payload, "displayName"),
                    photoUrl = jsFieldString(payload, "photoUrl"),
                    isEmailPasswordProvider = jsFieldBoolean(payload, "isEmailPassword") == true,
                    isEmailVerified = jsFieldBoolean(payload, "isEmailVerified") == true,
                )
            },
        )
    }
    awaitClose { jsDisposeListener(handle) }
}
