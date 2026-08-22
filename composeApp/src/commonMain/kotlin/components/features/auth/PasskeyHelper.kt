package components.features.auth

import androidx.compose.runtime.Composable

interface PasskeyRegistrar {
    suspend fun registerPasskey(): Pair<String, String>

    suspend fun authenticateWithPasskey(orderId: String): Boolean
}

@Composable
expect fun rememberPasskeyRegistrar(): PasskeyRegistrar
