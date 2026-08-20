package utils

import androidx.compose.ui.graphics.ImageBitmap

expect object PlatformUtils {
    fun generateQrCode(data: String): ImageBitmap?
    fun setScreenBrightness(brightness: Float)
    fun generateUUID(): String
}
