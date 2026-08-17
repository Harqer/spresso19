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
            onEmailSignInRequested = { email, password ->
                try {
                    signInWithEmail(email, password)
                } catch (e: Exception) {
                    window.alert("Email Sign-In failed: ${e.message}")
                }
            },
            onEmailSignUpRequested = { name, email, password ->
                try {
                    signUpWithEmail(name, email, password)
                } catch (e: Exception) {
                    window.alert("Email Sign-Up failed: ${e.message}")
                }
            }
        )
    }
}
