import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.ComposeViewport
import kotlinx.browser.document
import kotlinx.browser.window

@JsName("signInWithGoogle")
external fun signInWithGoogle()

@JsName("signInWithEmail")
external fun signInWithEmail(email: String, pass: String)

@JsName("signUpWithEmail")
external fun signUpWithEmail(name: String, email: String, pass: String)

@JsName("signInWithPhone")
external fun signInWithPhone(phoneNumber: String): kotlin.js.Promise<kotlin.js.JsAny?>

@JsName("verifyPhoneCode")
external fun verifyPhoneCode(code: String): kotlin.js.Promise<kotlin.js.JsAny?>

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    ComposeViewport(document.body!!) {
        App(
            onShare = { _ ->
                // Web Share API handled natively by browser
            },
            onGoogleSignInRequested = {
                try {
                    signInWithGoogle()
                } catch (e: Exception) {
                    window.alert("Google Sign-In failed: ${e.message}")
                }
            },
            onPhoneSignInRequested = {
                val phoneNumber = window.prompt("Enter phone number (e.g. +1234567890)")
                if (!phoneNumber.isNullOrBlank()) {
                    try {
                        signInWithPhone(phoneNumber).then { _ ->
                            val code = window.prompt("Enter SMS Code")
                            if (!code.isNullOrBlank()) {
                                verifyPhoneCode(code).then { success ->
                                    if (success != null) {
                                        window.alert("Phone authentication successful!")
                                    } else {
                                        window.alert("Phone authentication failed.")
                                    }
                                    null
                                }
                            }
                            null
                        }
                    } catch (e: Exception) {
                        window.alert("Phone Sign-In failed: ${e.message}")
                    }
                }
            }
        )
    }
}
