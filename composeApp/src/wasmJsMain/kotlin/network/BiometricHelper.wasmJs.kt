package network

import kotlinx.browser.window

actual suspend fun promptBiometricAuth(reason: String, payload: String): String? {
    // In Web, we simulate a secure prompt or rely on the browser's credential management
    val success = window.confirm("Secure Action Required: $reason\nDo you want to confirm this purchase?")
    return if (success) "simulated_wasm_signature" else null
}
