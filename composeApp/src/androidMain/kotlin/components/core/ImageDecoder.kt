package components.core

import android.graphics.BitmapFactory
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap

private const val MAX_DECODE_LONG_EDGE = 2048

actual fun ByteArray.makeImageBitmap(): ImageBitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(this, 0, this.size, bounds)
    val longEdge = maxOf(bounds.outWidth, bounds.outHeight)
    var sampleSize = 1
    while (longEdge / (sampleSize * 2) >= MAX_DECODE_LONG_EDGE) {
        sampleSize *= 2
    }
    val bitmap =
        BitmapFactory.decodeByteArray(
            this,
            0,
            this.size,
            BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            },
        ) ?: throw Exception("Failed to decode image bytes on Android")
    return bitmap.asImageBitmap()
}
