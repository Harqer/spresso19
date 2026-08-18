package components.features.camera

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke

@Composable
fun ObjectDetectionOverlay(
    detectedObjects: List<com.google.mlkit.vision.objects.DetectedObject>,
    modifier: Modifier = Modifier
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    Canvas(modifier = modifier.fillMaxSize()) {
        detectedObjects.forEach { obj ->
            val box = obj.boundingBox
            drawRect(
                color = primaryColor,
                topLeft = Offset(box.left.toFloat(), box.top.toFloat()),
                size = Size(box.width().toFloat(), box.height().toFloat()),
                style = Stroke(width = 6f),
                alpha = 0.8f
            )
        }
    }
}
