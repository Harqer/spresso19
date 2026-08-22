package components.features.spatial

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A standalone card component that implements the "Liquid Glass UI" aesthetic
 * commonly found in Apple's visionOS and modern Spatial Computing interfaces.
 *
 * It features a translucent gradient background and a subtle specular highlight border
 * to give the illusion of physical glass depth.
 */
@Composable
fun LiquidGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier =
            modifier
                .clip(RoundedCornerShape(cornerRadius))
                // The translucent "glass" body
                .background(
                    Brush.linearGradient(
                        colors =
                            listOf(
                                Color.White.copy(alpha = 0.25f),
                                Color.White.copy(alpha = 0.05f),
                            ),
                    ),
                )
                // The specular highlight edge (gives it that 3D glass thickness)
                .border(
                    width = 1.dp,
                    brush =
                        Brush.linearGradient(
                            colors =
                                listOf(
                                    Color.White.copy(alpha = 0.4f),
                                    Color.White.copy(alpha = 0.0f),
                                    Color.White.copy(alpha = 0.0f),
                                    Color.White.copy(alpha = 0.2f),
                                ),
                        ),
                    shape = RoundedCornerShape(cornerRadius),
                ).padding(16.dp),
        content = content,
    )
}
