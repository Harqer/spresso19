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

actual suspend fun promptBiometricAuth(reason: String, payload: String): String? = suspendCoroutine { continuation ->
    val activity = MainActivity.currentActivity as? FragmentActivity
    if (activity == null) {
        Log.e("BiometricAuth", "Current activity is null or not FragmentActivity")
        continuation.resume(null)
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
                    continuation.resume(null)
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    Log.d("BiometricAuth", "Auth succeeded with CryptoObject")
                    val sig = result.cryptoObject?.signature
                    if (sig != null) {
                        try {
                            sig.update(payload.toByteArray(Charsets.UTF_8))
                            val sigBytes = sig.sign()
                            val base64Sig = android.util.Base64.encodeToString(sigBytes, android.util.Base64.NO_WRAP)
                            val cert = keyStore.getCertificate(keyAlias)
                            val pubKey = cert?.publicKey?.encoded
                            val base64PubKey = if (pubKey != null) android.util.Base64.encodeToString(pubKey, android.util.Base64.NO_WRAP) else ""
                            
                            val escapedPayload = payload.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
                            val jsonString = "{\"payload\":\"${escapedPayload}\",\"signature\":\"$base64Sig\",\"publicKey\":\"$base64PubKey\"}"
                            val token = android.util.Base64.encodeToString(jsonString.toByteArray(Charsets.UTF_8), android.util.Base64.NO_WRAP)
                            
                            continuation.resume(token)
                        } catch (e: Exception) {
                            Log.e("BiometricAuth", "Signature error", e)
                            continuation.resume(null)
                        }
                    } else {
                        continuation.resume(null)
                    }
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
        continuation.resume(null)
    }
}
