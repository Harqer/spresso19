package utils

import androidx.compose.ui.graphics.ImageBitmap
import kotlin.random.Random

actual object PlatformUtils {
    actual fun generateQrCode(data: String): ImageBitmap? = null

    actual fun setScreenBrightness(brightness: Float) {
        // Brightness control is not exposed to the web platform.
    }

    actual fun generateUUID(): String = Random.nextLong().toString(16)
}
