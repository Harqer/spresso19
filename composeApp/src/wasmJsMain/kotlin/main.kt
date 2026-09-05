import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.ComposeViewport
import kotlinx.browser.document
import kotlinx.browser.window

@JsName("signInWithGoogle")
external fun signInWithGoogle()

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

@JsName("signInWithPhone")
external fun signInWithPhone(phoneNumber: String): kotlin.js.Promise<kotlin.js.JsAny?>

@JsName("verifyPhoneCode")
external fun verifyPhoneCode(code: String): kotlin.js.Promise<kotlin.js.JsAny?>

private fun ignoreShare(@Suppress("UNUSED_PARAMETER") value: String) = Unit

private fun handleGoogleSignIn() {
    try {
        signInWithGoogle()
    } catch (e: Exception) {
        window.alert("Google Sign-In failed: ${e.message}")
    }
}

private fun handlePhoneVerificationResult(success: kotlin.js.JsAny?): kotlin.js.JsAny? {
    window.alert(
        if (success != null) {
            "Phone authentication successful!"
        } else {
            "Phone authentication failed."
        },
    )
    return null
}

private fun handlePhoneCodePrompt(@Suppress("UNUSED_PARAMETER") result: kotlin.js.JsAny?): kotlin.js.JsAny? {
    val code = window.prompt("Enter SMS Code")
    if (!code.isNullOrBlank()) {
        verifyPhoneCode(code).then(::handlePhoneVerificationResult)
    }
    return null
}

private fun handlePhoneSignIn() {
    val phoneNumber = window.prompt("Enter phone number (e.g. +1234567890)")
    if (phoneNumber.isNullOrBlank()) return

    try {
        signInWithPhone(phoneNumber).then(::handlePhoneCodePrompt)
    } catch (e: Exception) {
        window.alert("Phone Sign-In failed: ${e.message}")
    }
}

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    ComposeViewport(document.body!!) {
        App(
            onShare = ::ignoreShare,
            onGoogleSignInRequested = ::handleGoogleSignIn,
            onPhoneSignInRequested = ::handlePhoneSignIn,
        )
    }
}
