package components.atoms

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable
fun ObjectBoundingBoxOverlay(
    ymin: Float,
    xmin: Float,
    ymax: Float,
    xmax: Float,
    modifier: Modifier = Modifier,
    strokeColor: Color = Color(0xFF10B981),
    label: String = "Detected object bounding box"
) {
    Canvas(
        modifier = modifier
            .fillMaxSize()
            .semantics(mergeDescendants = true) {
                contentDescription = label
            }
    ) {
        val scaleY = if (ymax > 1f) 1000f else 1f
        val scaleX = if (xmax > 1f) 1000f else 1f
        val left = (xmin / scaleX) * size.width
        val top = (ymin / scaleY) * size.height
        val width = ((xmax - xmin) / scaleX) * size.width
        val height = ((ymax - ymin) / scaleY) * size.height

        drawRect(
            color = strokeColor,
            topLeft = Offset(left, top),
            size = Size(width, height),
            style = Stroke(width = 3.dp.toPx())
        )
    }
}
