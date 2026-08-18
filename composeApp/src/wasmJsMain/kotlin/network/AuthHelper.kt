package network

import kotlin.js.Promise
import kotlinx.coroutines.await

external fun getFirebaseUserUid(): String?
external fun getFirebaseUserIdToken(): Promise<JsAny>?
external fun signOutFirebase()
external fun signInWithEmailAndPasswordFirebase(email: String, password: String): Promise<JsAny>
external fun createUserWithEmailAndPasswordFirebase(email: String, password: String): Promise<JsAny>

actual fun getCurrentUserUid(): String? {
    return getFirebaseUserUid()
}

actual suspend fun getCurrentUserIdToken(): String? {
    return getFirebaseUserIdToken()?.await<JsAny>()?.toString()
}

actual fun signOut() {
    signOutFirebase()
}

actual suspend fun signInWithEmailAndPassword(email: String, password: String): Boolean {
    return try {
        signInWithEmailAndPasswordFirebase(email, password).await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }
}

actual suspend fun createUserWithEmailAndPassword(email: String, password: String): Boolean {
    return try {
        createUserWithEmailAndPasswordFirebase(email, password).await<JsAny>()
        true
    } catch (e: Throwable) {
        false
    }
}

actual suspend fun signInWithGoogle(): Boolean {
    // Stub for Web
    return false
}
