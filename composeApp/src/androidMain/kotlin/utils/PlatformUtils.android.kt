package utils

import android.graphics.Bitmap
import android.view.WindowManager
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.spresso19.MainActivity
import java.util.UUID

actual object PlatformUtils {
    actual fun generateQrCode(data: String): ImageBitmap? {
        return try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(data, BarcodeFormat.QR_CODE, 512, 512)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
                }
            }
            bitmap.asImageBitmap()
        } catch (e: Exception) {
            null
        }
    }

    actual fun setScreenBrightness(brightness: Float) {
        val activity = MainActivity.currentActivity ?: return
        activity.runOnUiThread {
            val layoutParams = activity.window.attributes
            layoutParams.screenBrightness = brightness
            activity.window.attributes = layoutParams
        }
    }

    actual fun generateUUID(): String {
        return UUID.randomUUID().toString()
    }
}
