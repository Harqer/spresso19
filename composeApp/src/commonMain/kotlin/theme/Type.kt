package theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily

// Brand faces are resolved per platform: Google Fonts (Albert Sans / Instrument Serif)
// on Android, bundled TTFs on web. Sizes remain the Material 3 defaults, as in the
// Material Theme Builder export this theme was ported from.
@Composable
expect fun editorialSerifFontFamily(): FontFamily

@Composable
expect fun editorialSansFontFamily(): FontFamily

// Default Material 3 typography values
private val baseline = Typography()

@Composable
fun appTypography(): Typography =
    Typography(
        displayLarge = baseline.displayLarge.copy(fontFamily = editorialSerifFontFamily()),
        displayMedium = baseline.displayMedium.copy(fontFamily = editorialSerifFontFamily()),
        displaySmall = baseline.displaySmall.copy(fontFamily = editorialSerifFontFamily()),
        headlineLarge = baseline.headlineLarge.copy(fontFamily = editorialSerifFontFamily()),
        headlineMedium = baseline.headlineMedium.copy(fontFamily = editorialSerifFontFamily()),
        headlineSmall = baseline.headlineSmall.copy(fontFamily = editorialSerifFontFamily()),
        titleLarge = baseline.titleLarge.copy(fontFamily = editorialSansFontFamily()),
        titleMedium = baseline.titleMedium.copy(fontFamily = editorialSansFontFamily()),
        titleSmall = baseline.titleSmall.copy(fontFamily = editorialSansFontFamily()),
        bodyLarge = baseline.bodyLarge.copy(fontFamily = editorialSansFontFamily()),
        bodyMedium = baseline.bodyMedium.copy(fontFamily = editorialSansFontFamily()),
        bodySmall = baseline.bodySmall.copy(fontFamily = editorialSansFontFamily()),
        labelLarge = baseline.labelLarge.copy(fontFamily = editorialSansFontFamily()),
        labelMedium = baseline.labelMedium.copy(fontFamily = editorialSansFontFamily()),
        labelSmall = baseline.labelSmall.copy(fontFamily = editorialSansFontFamily()),
    )
