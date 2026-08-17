package com.spresso19.auth

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

@Composable
actual fun rememberBiometricAuthenticator(
    onSuccess: () -> Unit,
    onError: (String) -> Unit
): BiometricAuthenticator {
    return remember(onSuccess) {
        object : BiometricAuthenticator {
            override fun authenticate() {
                // Biometrics are not yet supported on Web, auto-success for dev/test
                onSuccess()
            }
        }
    }
}
