package theme

import android.os.Build
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

// Android actual: Material You dynamic color on Android 12+, otherwise the
// canonical Material Theme Builder brand scheme supplied by commonMain.
@Composable
actual fun PlatformTheme(
    useDarkTheme: Boolean,
    content: @Composable (ColorScheme?) -> Unit,
) {
    val dynamicColor = true
    val colorScheme =
        if (dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val context = LocalContext.current
            if (useDarkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        } else {
            null
        }
    content(colorScheme)
}
