package network

import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.spresso.BuildConfig
import com.spresso.MainActivity
import kotlinx.coroutines.launch
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
): Boolean =
    suspendCancellableCoroutine { continuation ->
        FirebaseAuth
            .getInstance()
            .createUserWithEmailAndPassword(email, password)
            .addOnSuccessListener {
                if (continuation.isActive) continuation.resume(true)
            }.addOnFailureListener {
                if (continuation.isActive) continuation.resume(false)
            }
    }

actual suspend fun signInWithGoogle(): Boolean =
    suspendCancellableCoroutine { continuation ->
        val activity = MainActivity.currentActivity
        if (activity == null) {
            if (continuation.isActive) continuation.resume(false)
            return@suspendCancellableCoroutine
        }

        val serverClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
        if (serverClientId.isBlank()) {
            if (continuation.isActive) continuation.resume(false)
            return@suspendCancellableCoroutine
        }

        val credentialManager = CredentialManager.create(activity)
        val googleIdOption =
            GetGoogleIdOption
                .Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(serverClientId)
                .setAutoSelectEnabled(true)
                .build()

        val request =
            GetCredentialRequest
                .Builder()
                .addCredentialOption(googleIdOption)
                .build()

        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
            try {
                val result =
                    credentialManager.getCredential(
                        context = activity,
                        request = request,
                    )
                val credential = result.credential
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
                    FirebaseAuth
                        .getInstance()
                        .signInWithCredential(firebaseCredential)
                        .addOnSuccessListener {
                            if (continuation.isActive) continuation.resume(true)
                        }.addOnFailureListener {
                            if (continuation.isActive) continuation.resume(false)
                        }
                } else {
                    if (continuation.isActive) continuation.resume(false)
                }
            } catch (e: androidx.credentials.exceptions.NoCredentialException) {
                if (continuation.isActive) continuation.resume(false)
            } catch (e: androidx.credentials.exceptions.GetCredentialException) {
                // Handle expected credential exceptions
                if (continuation.isActive) continuation.resume(false)
            } catch (e: Exception) {
                if (continuation.isActive) continuation.resume(false)
            }
        }
    }
