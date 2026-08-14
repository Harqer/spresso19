package network

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.spresso19.MainActivity
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

actual suspend fun promptBiometricAuth(reason: String): Boolean = suspendCoroutine { continuation ->
    val activity = MainActivity.currentActivity as? FragmentActivity
    if (activity == null) {
        Log.e("BiometricAuth", "Current activity is null or not FragmentActivity")
        continuation.resume(false)
        return@suspendCoroutine
    }

    try {
        val keyStore = KeyStore.getInstance("AndroidKeyStore")
        keyStore.load(null)
        val keyAlias = "spresso_checkout_biometric_sign_key"

        if (!keyStore.containsAlias(keyAlias)) {
            val keyPairGenerator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
            keyPairGenerator.initialize(
                KeyGenParameterSpec.Builder(
                    keyAlias,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
                )
                    .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                    .setUserAuthenticationRequired(true)
                    // High security: invalidate if new fingerprints are enrolled
                    .setInvalidatedByBiometricEnrollment(true)
                    .build()
            )
            keyPairGenerator.generateKeyPair()
        }

        val privateKey = keyStore.getKey(keyAlias, null) as java.security.PrivateKey
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey)

        val cryptoObject = BiometricPrompt.CryptoObject(signature)

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Confirm Purchase")
            .setDescription(reason)
            // Strictly require strong biometrics. No PIN fallback here.
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButtonText("Use Password")
            .setConfirmationRequired(true)
            .build()

        val biometricPrompt = BiometricPrompt(
            activity, 
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    Log.e("BiometricAuth", "Auth error: $errorCode - $errString")
                    continuation.resume(false)
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    Log.d("BiometricAuth", "Auth succeeded with CryptoObject")
                    // In a real app we'd use the unlocked signature to sign the payload.
                    // For now, simply validating it unlocks is proof of biometric presence.
                    continuation.resume(true)
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    Log.w("BiometricAuth", "Auth failed")
                    // Do not resume, let the prompt stay open or error out via onAuthenticationError
                }
            }
        )

        biometricPrompt.authenticate(promptInfo, cryptoObject)

    } catch (e: Exception) {
        Log.e("BiometricAuth", "Exception during biometric auth", e)
        continuation.resume(false)
    }
}
