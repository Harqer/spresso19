package network

/**
 * Triggers a secure biometric authentication prompt.
 * Uses Strong Biometrics (Class 3) and requires a Cryptographic binding
 * (CryptoObject) linked to the Android Keystore to authorize the action.
 */
expect suspend fun promptBiometricAuth(reason: String): Boolean
