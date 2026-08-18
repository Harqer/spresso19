package components.features.auth

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

@Composable
actual fun rememberPasskeyRegistrar(): PasskeyRegistrar {
    return remember {
        object : PasskeyRegistrar {
            override suspend fun registerPasskey(): Pair<String, String> {
                // Implementation for navigator.credentials.create() would go here
                return Pair("wasm_cred_id", "wasm_pub_key")
            }
        }
    }
}
