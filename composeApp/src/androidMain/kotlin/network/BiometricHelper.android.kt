package network

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

actual suspend fun promptBiometricAuth(
    reason: String,
    payload: String,
): String? =
    suspendCoroutine { continuation ->
        val activity = AndroidActivityBridge.currentActivity
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
                    KeyGenParameterSpec
                        .Builder(
                            keyAlias,
                            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
                        ).setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                        .setUserAuthenticationRequired(true)
                        // High security: invalidate if new fingerprints are enrolled
                        .setInvalidatedByBiometricEnrollment(true)
                        .build(),
                )
                keyPairGenerator.generateKeyPair()
            }

            val privateKey = keyStore.getKey(keyAlias, null) as java.security.PrivateKey
            val signature = Signature.getInstance("SHA256withECDSA")
            signature.initSign(privateKey)

            val cryptoObject = BiometricPrompt.CryptoObject(signature)

            val promptInfo =
                BiometricPrompt.PromptInfo
                    .Builder()
                    .setTitle("Confirm Purchase")
                    .setDescription(reason)
                    // Strictly require strong biometrics. No PIN fallback here.
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                    .setNegativeButtonText("Use Password")
                    .setConfirmationRequired(true)
                    .build()

            val biometricPrompt =
                BiometricPrompt(
                    activity,
                    ContextCompat.getMainExecutor(activity),
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationError(
                            errorCode: Int,
                            errString: CharSequence,
                        ) {
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
                                    // The backend consumes the raw 64-byte r||s
                                    // form; convert from the Keystore's DER output.
                                    val rawSigBase64 =
                                        normalizeDeviceSignature(android.util.Base64.encodeToString(sigBytes, android.util.Base64.NO_WRAP))
                                            ?: throw IllegalStateException("Signature encoding failed")
                                    val cert = keyStore.getCertificate(keyAlias)
                                    val pubKey = cert?.publicKey?.encoded
                                    val base64PubKey =
                                        if (pubKey !=
                                            null
                                        ) {
                                            // Backend canonical form is the raw
                                            // P-256 point; convert from SPKI DER.
                                            normalizeDevicePublicKey(
                                                android.util.Base64.encodeToString(pubKey, android.util.Base64.NO_WRAP),
                                            ) ?: throw IllegalStateException("Key encoding failed")
                                        } else {
                                            ""
                                        }

                                    val escapedPayload =
                                        payload
                                            .replace("\\", "\\\\")
                                            .replace("\"", "\\\"")
                                            .replace("\n", "\\n")
                                    val jsonString =
                                        "{\"payload\":\"${escapedPayload}\"," +
                                            "\"signature\":\"$rawSigBase64\"," +
                                            "\"publicKey\":\"$base64PubKey\"}"
                                    val token =
                                        android.util.Base64.encodeToString(
                                            jsonString.toByteArray(Charsets.UTF_8),
                                            android.util.Base64.NO_WRAP,
                                        )

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
                    },
                )

            biometricPrompt.authenticate(promptInfo, cryptoObject)
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Exception during biometric auth", e)
            continuation.resume(null)
        }
    }

/**
 * Android checkout signing key: an EC P-256 key pair in the Android Keystore
 * (separate from the biometric prompt key). The private key is non-exportable
 * and requires biometric unlock per signature; only the public SPKI DER ever
 * leaves the device. Returns base64 SPKI DER — the registration bridge
 * normalizes it to the raw P-256 point the backend stores.
 */
actual suspend fun getCheckoutDevicePublicKey(): String? =
    withContext(Dispatchers.IO) {
        try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore")
            keyStore.load(null)
            val alias = "spresso_checkout_device_key"
            if (!keyStore.containsAlias(alias)) {
                val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
                generator.initialize(
                    KeyGenParameterSpec
                        .Builder(alias, KeyProperties.PURPOSE_SIGN)
                        .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                        .setDigests(KeyProperties.DIGEST_SHA256)
                        .setUserAuthenticationRequired(true)
                        .setInvalidatedByBiometricEnrollment(true)
                        .build(),
                )
                generator.generateKeyPair()
            }
            val certificate = keyStore.getCertificate(alias)
            android.util.Base64.encodeToString(certificate.publicKey.encoded, android.util.Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e("BiometricAuth", "Checkout device key unavailable", e)
            null
        }
    }

/** Base64(SPKI DER) → base64 raw uncompressed P-256 point (server canonical form). */
fun normalizeDevicePublicKey(base64Spki: String): String? {
    val der =
        try {
            android.util.Base64.decode(base64Spki, android.util.Base64.NO_WRAP)
        } catch (_: IllegalArgumentException) {
            return null
        }
    // P-256 SPKI is 91 bytes: fixed 26-byte header + the full 65-byte raw
    // point (which itself starts with its 0x04 uncompressed tag).
    if (der.size != 91 || der[26] != 0x04.toByte()) return null
    val raw = der.copyOfRange(26, der.size)
    return android.util.Base64.encodeToString(raw, android.util.Base64.NO_WRAP)
}

/** DER ECDSA signature → raw r||s (64 bytes), the WebCrypto-compatible form. */
fun normalizeDeviceSignature(base64DerSignature: String): String? {
    val der =
        try {
            android.util.Base64.decode(base64DerSignature, android.util.Base64.NO_WRAP)
        } catch (_: IllegalArgumentException) {
            return null
        }
    // SEQUENCE { INTEGER r, INTEGER s } — parse the two minimal DER integers.
    if (der.isEmpty() || der[0] != 0x30.toByte()) return null
    var index = 2
    if (der[index].toInt() and 0x80 != 0) {
        val lengthBytes = der[index].toInt() and 0x7f
        if (lengthBytes < 1 || lengthBytes > 2) return null
        var length = 0
        repeat(lengthBytes) {
            length = (length shl 8) or (der[index + 1].toInt() and 0xff)
            index += 1
        }
        index += 1
    }
    index += 1 // step past the SEQUENCE content length byte(s) we already consumed

    fun readInteger(): ByteArray? {
        if (index >= der.size || der[index] != 0x02.toByte()) return null
        index += 1
        val length = der[index].toInt() and 0xff
        index += 1
        if (length == 0 || index + length > der.size) return null
        val value = der.copyOfRange(index, index + length)
        index += length
        // Strip a leading zero used only to mark the integer as positive.
        var start = 0
        while (start < value.size - 1 && value[start] == 0.toByte()) start += 1
        return value.copyOfRange(start, value.size)
    }
    val r = readInteger() ?: return null
    val s = readInteger() ?: return null
    if (r.size > 33 || s.size > 33) return null
    val out = ByteArray(64)
    r.copyInto(out, 32 - r.size, 0, r.size)
    s.copyInto(out, 64 - s.size, 0, s.size)
    return android.util.Base64.encodeToString(out, android.util.Base64.NO_WRAP)
}
