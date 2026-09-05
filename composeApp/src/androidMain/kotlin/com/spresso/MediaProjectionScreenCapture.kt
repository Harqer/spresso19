package com.spresso

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

/** Captures one user-approved frame and immediately releases MediaProjection resources. */
internal class MediaProjectionScreenCapture(
    private val context: Context,
) {
    private val manager = context.getSystemService(MediaProjectionManager::class.java)

    fun permissionIntent(): Intent = manager.createScreenCaptureIntent()

    fun capture(
        resultCode: Int,
        data: Intent,
        onResult: (ByteArray) -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        val projection =
            manager.getMediaProjection(resultCode, data)
                ?: return onError(IllegalStateException("Screen capture permission was not granted."))
        val metrics = context.resources.displayMetrics
        val width = metrics.widthPixels.coerceAtMost(1920)
        val height = metrics.heightPixels.coerceAtMost(1920)
        val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        var display: VirtualDisplay? = null
        val handler = Handler(Looper.getMainLooper())
        reader.setOnImageAvailableListener({ source ->
            val image = source.acquireLatestImage() ?: return@setOnImageAvailableListener
            try {
                val plane = image.planes.first()
                val rowBytes = width * plane.pixelStride
                val packed = ByteArray(rowBytes * height)
                val source = plane.buffer
                for (row in 0 until height) {
                    source.position(row * plane.rowStride)
                    source.get(packed, row * rowBytes, rowBytes)
                }
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                bitmap.copyPixelsFromBuffer(ByteBuffer.wrap(packed))
                val output = ByteArrayOutputStream()
                check(bitmap.compress(Bitmap.CompressFormat.JPEG, 82, output)) { "Screen capture encoding failed" }
                onResult(output.toByteArray())
            } catch (error: Throwable) {
                onError(error)
            } finally {
                image.close()
                display?.release()
                display = null
                reader.close()
                projection.stop()
            }
        }, handler)
        display =
            projection.createVirtualDisplay(
                "SpressoLensCapture",
                width,
                height,
                metrics.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                handler,
            )
        handler.postDelayed({
            if (display != null) {
                display?.release()
                display = null
                reader.close()
                projection.stop()
                onError(IllegalStateException("Screen capture timed out."))
            }
        }, 3000)
    }
}
