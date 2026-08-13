package components.pages

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import components.atoms.AuthHeader
import components.molecules.AuthForm
import components.molecules.AuthToggle
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

@Composable
fun AuthPage(
    initialMode: String = "signin",
    onSuccess: () -> Unit = {},
    onGoogleSignInRequested: () -> Unit = {},
    onEmailSignInRequested: (String, String) -> Unit = { _, _ -> },
    onEmailSignUpRequested: (String, String, String) -> Unit = { _, _, _ -> }
) {
    var mode by remember { mutableStateOf(initialMode) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val brandBeige = Color(0xFFF2EFE8)

    Box(modifier = Modifier.fillMaxSize().background(brandBeige), contentAlignment = Alignment.Center) {
        Surface(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color.White.copy(alpha = 0.5f)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                AuthHeader(mode = mode)

                AuthToggle(mode = mode, onModeChange = { mode = it; errorMsg = null })

                AuthForm(
                    mode = mode,
                    email = email, onEmailChange = { email = it },
                    password = password, onPasswordChange = { password = it },
                    name = name, onNameChange = { name = it },
                    loading = loading, errorMsg = errorMsg,
                    onGoogleSignInRequested = onGoogleSignInRequested,
                    onSubmitRequested = {
                        loading = true; errorMsg = null
                        if (mode == "signin") onEmailSignInRequested(email, password)
                        else onEmailSignUpRequested(name, email, password)
                    }
                )
            }
        }
    }
}

@Preview
@Composable
fun AuthPageSignInPreview() {
    AppTheme { AuthPage(initialMode = "signin") }
}

@Preview
@Composable
fun AuthPageSignUpPreview() {
    AppTheme { AuthPage(initialMode = "register") }
}
