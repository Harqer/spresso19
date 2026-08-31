package components.features.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope

sealed interface PasskeyRegistrationRequest {
    data class Ready(
        val requestJson: String,
        val completeRegistration: suspend (registrationResponseJson: String) -> PasskeyRegistrationResult,
    ) : PasskeyRegistrationRequest

    data object BackendUnavailable : PasskeyRegistrationRequest
}

sealed interface PasskeyRegistrationResult {
    data object Registered : PasskeyRegistrationResult

    data object Cancelled : PasskeyRegistrationResult

    data object BackendUnavailable : PasskeyRegistrationResult

    data class BackendFailure(
        val message: String = "Passkey setup could not be completed. Try again later.",
    ) : PasskeyRegistrationResult

    data class ProviderFailure(
        val message: String = "Passkey setup is unavailable on this device. Try again after checking your device credential settings.",
    ) : PasskeyRegistrationResult
}

data class PasskeyRegistrationState(
    val isRegistering: Boolean = false,
    val isCompleted: Boolean = false,
    val message: String? = null,
) {
    fun begin(): PasskeyRegistrationState = copy(isRegistering = true, message = null)

    fun after(result: PasskeyRegistrationResult): PasskeyRegistrationState =
        when (result) {
            PasskeyRegistrationResult.Registered -> copy(isRegistering = false, isCompleted = true, message = null)
            PasskeyRegistrationResult.Cancelled -> copy(isRegistering = false, message = "Passkey setup was canceled.")
            PasskeyRegistrationResult.BackendUnavailable ->
                copy(
                    isRegistering = false,
                    message = "Passkey setup is unavailable until secure registration is available.",
                )
            is PasskeyRegistrationResult.BackendFailure -> copy(isRegistering = false, message = result.message)
            is PasskeyRegistrationResult.ProviderFailure -> copy(isRegistering = false, message = result.message)
        }
}

@Composable
fun PasskeyRegistrationStep(
    onRegistrationRequested: suspend () -> PasskeyRegistrationResult,
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(PasskeyRegistrationState()) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(if (state.isCompleted) "Passkey ready" else "Passkey setup")
        Text("Use your device credential to protect checkout.")
        if (!state.isCompleted) {
            Button(
                enabled = !state.isRegistering,
                onClick = {
                    scope.launch {
                        state = state.begin()
                        val result =
                            runCatching { onRegistrationRequested() }
                                .getOrElse { PasskeyRegistrationResult.BackendFailure() }
                        state = state.after(result)
                    }
                },
            ) {
                Text(if (state.isRegistering) "Setting up passkey" else "Set up passkey")
            }
        }
        state.message?.let(::Text)
    }
}
