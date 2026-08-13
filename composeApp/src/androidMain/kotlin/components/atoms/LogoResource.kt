package components.atoms

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import com.spresso19.R

@Composable
actual fun rememberBrandLogoPainter(): Painter {
    val context = LocalContext.current
    return remember {
        val options = BitmapFactory.Options().apply { inMutable = true }
        // Try to load the official logo from Android resources
        val bitmap = try {
            BitmapFactory.decodeResource(context.resources, R.drawable.spresso_official_logo, options)
        } catch (e: Exception) {
            null
        }
        
        if (bitmap != null) {
            val transparentBitmap = removeBackground(bitmap)
            BitmapPainter(transparentBitmap.asImageBitmap())
        } else {
            // High-fidelity vector fallback if resource is missing
            BitmapPainter(Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).apply { eraseColor(Color.TRANSPARENT) }.asImageBitmap())
        }
    }
}

private fun removeBackground(bitmap: Bitmap): Bitmap {
    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    
    // Sampling background from top-left corner
    val bgColor = pixels[0]
    val bgR = Color.red(bgColor)
    val bgG = Color.green(bgColor)
    val bgB = Color.blue(bgColor)
    
    for (i in pixels.indices) {
        val pixel = pixels[i]
        val r = Color.red(pixel)
        val g = Color.green(pixel)
        val b = Color.blue(pixel)
        
        // Remove pixels similar to the corner color
        val diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)
        
        // Very broad detection to ensure all "Vanilla" background is removed
        if (diff < 100 || (r > 210 && g > 210 && b > 200)) {
            pixels[i] = Color.TRANSPARENT
        }
    }
    
    val result = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    result.setPixels(pixels, 0, width, 0, 0, width, height)
    return result
}
