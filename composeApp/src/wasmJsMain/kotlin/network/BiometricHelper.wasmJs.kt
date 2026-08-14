package network

import kotlinx.browser.window

actual suspend fun promptBiometricAuth(reason: String): Boolean {
    // In Web, we simulate a secure prompt or rely on the browser's credential management
    return window.confirm("Secure Action Required: $reason\nDo you want to confirm this purchase?")
}
