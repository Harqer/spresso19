package com.spresso.auth

import androidx.compose.runtime.Composable

interface BiometricAuthenticator {
    fun authenticate()
}

@Composable
expect fun rememberBiometricAuthenticator(
    onSuccess: () -> Unit,
    onError: (String) -> Unit,
): BiometricAuthenticator
