package utils

import androidx.compose.ui.graphics.ImageBitmap
import kotlin.random.Random

actual object PlatformUtils {
    actual fun generateQrCode(data: String): ImageBitmap? {
        // Production: Use a JS library or canvas implementation for QR generation on Web
        return null
    }

    actual fun setScreenBrightness(brightness: Float) {
        // Browser doesn't support setting screen brightness directly
    }

    actual fun generateUUID(): String {
        return Random.nextLong().toString(16) // Simplified fallback for WasmJS
    }
}
