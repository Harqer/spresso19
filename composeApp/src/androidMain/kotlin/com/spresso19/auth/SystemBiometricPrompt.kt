package com.spresso19.auth

import androidx.biometric.BiometricPrompt
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

@Composable
actual fun rememberBiometricAuthenticator(
    onSuccess: () -> Unit,
    onError: (String) -> Unit
): BiometricAuthenticator {
    val context = LocalContext.current
    
    return remember(context, onSuccess, onError) {
        object : BiometricAuthenticator {
            override fun authenticate() {
                val fragmentActivity = context as? FragmentActivity
                if (fragmentActivity == null) {
                    onError("Cannot authenticate without FragmentActivity")
                    return
                }
                
                val executor = ContextCompat.getMainExecutor(context)
                val biometricPrompt = BiometricPrompt(
                    fragmentActivity,
                    executor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            super.onAuthenticationError(errorCode, errString)
                            onError(errString.toString())
                        }
                        
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            super.onAuthenticationSucceeded(result)
                            onSuccess()
                        }
                        
                        override fun onAuthenticationFailed() {
                            super.onAuthenticationFailed()
                            onError("Biometric authentication failed")
                        }
                    }
                )
                
                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Biometric Authentication")
                    .setSubtitle("Confirm your identity")
                    .setNegativeButtonText("Cancel")
                    .build()
                    
                biometricPrompt.authenticate(promptInfo)
            }
        }
    }
}
