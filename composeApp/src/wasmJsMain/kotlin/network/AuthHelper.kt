package network

import kotlinx.coroutines.await
import kotlin.js.Promise

external fun getFirebaseUserUid(): String?

external fun getFirebaseUserIdToken(): Promise<JsAny>?

external fun signOutFirebase()

external fun signInWithEmailAndPasswordFirebase(
    email: String,
    password: String,
): Promise<JsAny>

external fun createUserWithEmailAndPasswordFirebase(
    email: String,
    password: String,
): Promise<JsAny>

@JsName("signInWithGoogle")
external fun triggerGoogleSignIn()

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
): Boolean =
    try {
        createUserWithEmailAndPasswordFirebase(email, password).await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }

actual suspend fun signInWithGoogle(): Boolean =
    try {
        triggerGoogleSignIn()
        true
    } catch (e: Throwable) {
        false
    }
