package theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF386633),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFE8F3E8),
    onPrimaryContainer = Color(0xFF18211E),
    secondary = Color(0xFF84CC16),
    onSecondary = Color(0xFF18211E),
    background = Color(0xFFF8FAF8),
    onBackground = Color(0xFF18211E),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF18211E),
    surfaceVariant = Color(0xFFE2EFE2),
    onSurfaceVariant = Color(0xFF556258),
    outline = Color(0xFFD8EBD7)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF84CC16),
    onPrimary = Color(0xFF18211E),
    primaryContainer = Color(0xFF284024),
    onPrimaryContainer = Color(0xFFE8F3E8),
    secondary = Color(0xFF386633),
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFF18211E),
    onBackground = Color(0xFFF8FAF8),
    surface = Color(0xFF222924),
    onSurface = Color(0xFFF8FAF8),
    surfaceVariant = Color(0xFF2D3830),
    onSurfaceVariant = Color(0xFFC4D6C3),
    outline = Color(0xFF3D4A40)
)

@Composable
fun AppTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (!useDarkTheme) {
        LightColors
    } else {
        DarkColors
    }

    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}
