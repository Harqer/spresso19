package network

import com.google.firebase.auth.FirebaseAuth
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

actual fun getCurrentUserUid(): String? = FirebaseAuth.getInstance().currentUser?.uid

actual suspend fun getCurrentUserIdToken(): String? = suspendCancellableCoroutine { continuation ->
    val user = FirebaseAuth.getInstance().currentUser
    if (user == null) {
        continuation.resume(null)
        return@suspendCancellableCoroutine
    }

    user.getIdToken(false)
        .addOnSuccessListener { result ->
            if (continuation.isActive) continuation.resume(result.token)
        }
        .addOnFailureListener {
            if (continuation.isActive) continuation.resume(null)
        }
}
