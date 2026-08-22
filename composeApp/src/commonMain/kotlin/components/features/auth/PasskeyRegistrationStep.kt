package components.features.auth

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import components.features.onboarding.OnboardingStepCard
import kotlinx.coroutines.launch
import network.ApiClient
import network.Telemetry

@Composable
fun PasskeyRegistrationStep(
    isCompleted: Boolean,
    onPasskeyRegistered: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    var isRegistering by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val passkeyRegistrar = rememberPasskeyRegistrar()

    OnboardingStepCard(
        title = "Secure with Passkey",
        description = "Highly Recommended: Register a Passkey for seamless, passwordless login.",
        icon = Icons.Default.Lock,
        isCompleted = isCompleted,
        actionText =
            if (isCompleted) {
                "Passkey Registered (+150 XP)"
            } else if (isRegistering) {
                "Registering..."
            } else if (errorMessage !=
                null
            ) {
                "Retry Registration"
            } else {
                "Register Passkey"
            },
        onActionClick = {
            if (!isCompleted && !isRegistering) {
                isRegistering = true
                errorMessage = null
                scope.launch {
                    try {
                        val (credId, pubKey) = passkeyRegistrar.registerPasskey()
                        val apiClient = ApiClient()
                        apiClient.registerPasskey(credId, pubKey)
                        onPasskeyRegistered()
                    } catch (e: Exception) {
                        errorMessage = "Registration failed"
                        Telemetry.recordError("Failed to register passkey", e)
                    } finally {
                        isRegistering = false
                    }
                }
            }
        },
        modifier = modifier,
    )
}
