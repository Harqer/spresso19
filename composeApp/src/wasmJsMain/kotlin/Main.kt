@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.ComposeViewport
import kotlinx.browser.document
import kotlinx.browser.window

@JsName("signInWithGoogle")
external fun signInWithGoogle()

external fun getFirebaseUserUid(): String?

external fun observeFirebaseAuth(callback: (String?, Boolean) -> Unit): () -> Unit

@JsName("signInWithEmail")
external fun signInWithEmail(
    email: String,
    pass: String,
)

@JsName("signUpWithEmail")
external fun signUpWithEmail(
    name: String,
    email: String,
    pass: String,
)

external fun requestPhoneSignIn(): kotlin.js.Promise<kotlin.js.JsAny?>

private fun ignoreShare(
    @Suppress("UNUSED_PARAMETER") value: String,
) = Unit

private fun handleGoogleSignIn() {
    try {
        signInWithGoogle()
    } catch (e: Exception) {
        window.alert("Google Sign-In failed: ${e.message}")
    }
}

private fun handlePhoneSignIn() {
    requestPhoneSignIn()
}

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    ComposeViewport(document.getElementById("app")!!) {
        var currentUserUid by remember { mutableStateOf(getFirebaseUserUid()) }
        var isAuthLoading by remember { mutableStateOf(true) }
        var isEmailVerificationRequired by remember { mutableStateOf(false) }

        DisposableEffect(Unit) {
            val unsubscribe =
                observeFirebaseAuth { uid, requiresVerification ->
                    currentUserUid = uid
                    isEmailVerificationRequired = requiresVerification
                    isAuthLoading = false
                }
            onDispose { unsubscribe() }
        }

        App(
            currentUserUid = currentUserUid,
            isAuthLoading = isAuthLoading,
            isEmailVerificationRequired = isEmailVerificationRequired,
            onShare = ::ignoreShare,
            onGoogleSignInRequested = ::handleGoogleSignIn,
            onPhoneSignInRequested = ::handlePhoneSignIn,
        )
    }
}
