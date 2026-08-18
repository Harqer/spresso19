package components.features.auth

import androidx.compose.runtime.Composable

interface PasskeyRegistrar {
    suspend fun registerPasskey(): Pair<String, String>
}

@Composable
expect fun rememberPasskeyRegistrar(): PasskeyRegistrar
