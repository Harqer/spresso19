package theme

import androidx.compose.material3.ColorScheme
import androidx.compose.runtime.Composable

@Composable
actual fun PlatformTheme(
    useDarkTheme: Boolean,
    content: @Composable (ColorScheme?) -> Unit,
) {
    content(null)
}
