package network

import com.google.firebase.auth.FirebaseAuth
import auth.IdentitySession
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

actual fun getCurrentUserUid(): String? = FirebaseAuth.getInstance().currentUser?.uid

actual suspend fun getCurrentUserIdToken(): String? =
    suspendCancellableCoroutine { continuation ->
        val user = FirebaseAuth.getInstance().currentUser
        if (user == null) {
            continuation.resume(null)
            return@suspendCancellableCoroutine
        }

        user
            .getIdToken(false)
            .addOnSuccessListener { result ->
                if (continuation.isActive) continuation.resume(result.token)
            }.addOnFailureListener {
                if (continuation.isActive) continuation.resume(null)
            }
    }

actual fun signOut() {
    FirebaseAuth.getInstance().signOut()
}

actual suspend fun signInWithEmailAndPassword(
    email: String,
    password: String,
): Boolean =
    suspendCancellableCoroutine { continuation ->
        FirebaseAuth
            .getInstance()
            .signInWithEmailAndPassword(email, password)
            .addOnSuccessListener {
                if (continuation.isActive) continuation.resume(true)
            }.addOnFailureListener {
                if (continuation.isActive) continuation.resume(false)
            }
    }

actual suspend fun createUserWithEmailAndPassword(
    email: String,
    password: String,
    displayName: String?,
): Boolean =
    suspendCancellableCoroutine { continuation ->
        FirebaseAuth
            .getInstance()
            .createUserWithEmailAndPassword(email, password)
            .addOnSuccessListener { result ->
                val createdUser = result.user
                if (createdUser == null) {
                    if (continuation.isActive) continuation.resume(false)
                    return@addOnSuccessListener
                }
                // Full name flows into the Firebase profile (the auth
                // correction: AuthPage must not drop it), then the
                // verification email goes out.
                val profileUpdates = com.google.firebase.auth.UserProfileChangeRequest.Builder()
                    .setDisplayName(displayName)
                    .build()
                createdUser.updateProfile(profileUpdates).addOnCompleteListener {
                    createdUser.sendEmailVerification().addOnCompleteListener { verificationTask ->
                        if (continuation.isActive) continuation.resume(verificationTask.isSuccessful)
                    }
                }
            }.addOnFailureListener {
                if (continuation.isActive) continuation.resume(false)
            }
    }

actual suspend fun deleteCurrentUserIdentity(): Boolean =
    suspendCancellableCoroutine { continuation ->
        val user = FirebaseAuth.getInstance().currentUser
        if (user == null) {
            continuation.resume(true)
            return@suspendCancellableCoroutine
        }
        user
            .delete()
            .addOnSuccessListener { if (continuation.isActive) continuation.resume(true) }
            .addOnFailureListener { if (continuation.isActive) continuation.resume(false) }
    }

actual suspend fun sendEmailVerification(): Boolean =
    suspendCancellableCoroutine { continuation ->
        val user = FirebaseAuth.getInstance().currentUser
        if (user == null) {
            continuation.resume(false)
            return@suspendCancellableCoroutine
        }
        user
            .sendEmailVerification()
            .addOnSuccessListener { if (continuation.isActive) continuation.resume(true) }
            .addOnFailureListener { if (continuation.isActive) continuation.resume(false) }
    }

actual suspend fun sendPasswordResetEmail(email: String): Boolean =
    suspendCancellableCoroutine { continuation ->
        FirebaseAuth
            .getInstance()
            .sendPasswordResetEmail(email.trim())
            .addOnSuccessListener { if (continuation.isActive) continuation.resume(true) }
            .addOnFailureListener { if (continuation.isActive) continuation.resume(false) }
    }

actual suspend fun reloadCurrentUser(): Boolean =
    suspendCancellableCoroutine { continuation ->
        val user = FirebaseAuth.getInstance().currentUser
        if (user == null) {
            continuation.resume(false)
            return@suspendCancellableCoroutine
        }
        user
            .reload()
            .addOnSuccessListener {
                // Verification state changed: mint a fresh token so the
                // Convex client session picks up the updated claims.
                FirebaseAuth.getInstance().currentUser?.getIdToken(true)
                    ?.addOnCompleteListener { if (continuation.isActive) continuation.resume(true) }
            }
            .addOnFailureListener { if (continuation.isActive) continuation.resume(false) }
    }

/**
 * Google sign-in lives ONLY in MainActivity (Android CredentialManager →
 * Firebase credential). The duplicate common-code path was removed by the
 * auth correction; AuthPage no longer calls a Google helper.
 */

/**
 * Normalized identity session for the shared KMP contract: driven by the SAME
 * single FirebaseAuth.IdTokenListener discipline as FirebaseConvexAuthProvider
 * (sign-in, sign-out, user replacement, token refresh). Emission happens on a
 * Firebase callback thread; collectors see the latest session.
 */
actual val identitySessionFlow: Flow<IdentitySession> = kotlinx.coroutines.flow.callbackFlow {
    val listener = FirebaseAuth.IdTokenListener { auth ->
        val user = auth.currentUser
        if (user == null) {
            trySend(IdentitySession.SignedOut)
            return@IdTokenListener
        }
        // The token mint normalizes refresh-driven emissions; the session
        // facts themselves come from the FirebaseUser.
        user.getIdToken(false).addOnCompleteListener {
            trySend(
                IdentitySession(
                    firebaseUid = user.uid,
                    email = user.email,
                    displayName = user.displayName,
                    photoUrl = user.photoUrl?.toString(),
                    isEmailPasswordProvider = user.providerData.any { it.providerId == "password" },
                    isEmailVerified = user.isEmailVerified,
                ),
            )
        }
    }
    FirebaseAuth.getInstance().addIdTokenListener(listener)
    awaitClose { FirebaseAuth.getInstance().removeIdTokenListener(listener) }
}
