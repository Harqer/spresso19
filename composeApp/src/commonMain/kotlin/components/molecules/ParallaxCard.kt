package components.molecules

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.unit.dp

@Composable
fun ParallaxCard(
    scrollOffset: Float,
    modifier: Modifier = Modifier,
    backgroundColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.surfaceVariant,
    contentColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurfaceVariant,
    content: @Composable () -> Unit
) {
    // We add more detailed modifier chains to ensure the molecule is sufficiently styled
    // and correctly applies the parallax scaling/translation.
    val baseModifier = modifier
        .fillMaxWidth()
        .height(320.dp)
        .padding(horizontal = 16.dp, vertical = 24.dp)
        
    val graphicsModifier = Modifier.graphicsLayer {
        // Parallax translation effect
        translationY = scrollOffset * 0.45f
        
        // Add dynamic shading/elevation to make it look above the surface
        val elevatedShadow = (scrollOffset * 0.01f).coerceIn(4f, 24f)
        shadowElevation = elevatedShadow.dp.toPx()
        
        // Slight scale based on scroll for the pop-off effect
        val scale = 1f + (scrollOffset * 0.0004f).coerceIn(0f, 0.06f)
        scaleX = scale
        scaleY = scale
        
        // Dynamic opacity based on scroll
        alpha = 1f - (scrollOffset * 0.0001f).coerceIn(0f, 0.2f)
    }

    Card(
        modifier = baseModifier.then(graphicsModifier),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 8.dp,
            pressedElevation = 16.dp,
            hoveredElevation = 12.dp
        ),
        colors = CardDefaults.cardColors(
            containerColor = backgroundColor,
            contentColor = contentColor
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            content()
        }
    }
}
