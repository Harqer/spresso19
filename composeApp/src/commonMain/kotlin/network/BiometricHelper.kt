package network

/**
 * Triggers a secure biometric authentication prompt and returns a signed
 * assertion bundle: base64 JSON `{ payload, signature, publicKey }`.
 * Uses Strong Biometrics (Class 3) and requires a Cryptographic binding
 * (CryptoObject) linked to the Android Keystore to authorize the action.
 */
expect suspend fun promptBiometricAuth(
    reason: String,
    payload: String,
): String?

/**
 * Ensures a checkout signing key exists on this device and returns the public
 * key to register with the backend (base64 SPKI DER on Android, base64 raw
 * uncompressed P-256 point on web). Returns null when no secure enrollment
 * surface is available.
 */
expect suspend fun getCheckoutDevicePublicKey(): String?

/**
 * Parses the platform assertion bundle: base64 JSON
 * `{ payload, signature, publicKey }`. The signature is base64 of the raw
 * 64-byte r||s form on both platforms (Android converts its DER output), and
 * the public key is base64 of the raw uncompressed P-256 point (Android
 * converts its SPKI DER).
 */
suspend fun parseBiometricAssertion(token: String): BiometricAssertion? =
    runCatching {
        val decoded =
            kotlin.io.encoding.Base64.Default
                .decode(token)
                .decodeToString()
        val start = decoded.indexOf("\"signature\":\"") + "\"signature\":".length + 1
        val end = decoded.indexOf("\"", start)
        val signature = decoded.substring(start, end)
        val publicKeyStart = decoded.indexOf("\"publicKey\":\"") + "\"publicKey\":".length + 1
        val publicKeyEnd = decoded.indexOf("\"", publicKeyStart)
        val publicKey = decoded.substring(publicKeyStart, publicKeyEnd)
        BiometricAssertion(signature = signature, publicKey = publicKey)
    }.getOrNull()

/** Device-signed checkout assertion extracted from the platform bundle. */
data class BiometricAssertion(
    val signature: String,
    val publicKey: String,
)
