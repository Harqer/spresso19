package theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

private val LightScheme =
    lightColorScheme(
        primary = PrimaryLight,
        onPrimary = OnPrimaryLight,
        primaryContainer = PrimaryContainerLight,
        onPrimaryContainer = OnPrimaryContainerLight,
        secondary = SecondaryLight,
        onSecondary = OnSecondaryLight,
        secondaryContainer = SecondaryContainerLight,
        onSecondaryContainer = OnSecondaryContainerLight,
        tertiary = TertiaryLight,
        onTertiary = OnTertiaryLight,
        tertiaryContainer = TertiaryContainerLight,
        onTertiaryContainer = OnTertiaryContainerLight,
        error = ErrorLight,
        onError = OnErrorLight,
        errorContainer = ErrorContainerLight,
        onErrorContainer = OnErrorContainerLight,
        background = BackgroundLight,
        onBackground = OnBackgroundLight,
        surface = SurfaceLight,
        onSurface = OnSurfaceLight,
        surfaceVariant = SurfaceVariantLight,
        onSurfaceVariant = OnSurfaceVariantLight,
        outline = OutlineLight,
        outlineVariant = OutlineVariantLight,
        scrim = ScrimLight,
        inverseSurface = InverseSurfaceLight,
        inverseOnSurface = InverseOnSurfaceLight,
        inversePrimary = InversePrimaryLight,
        surfaceDim = SurfaceDimLight,
        surfaceBright = SurfaceBrightLight,
        surfaceContainerLowest = SurfaceContainerLowestLight,
        surfaceContainerLow = SurfaceContainerLowLight,
        surfaceContainer = SurfaceContainerLight,
        surfaceContainerHigh = SurfaceContainerHighLight,
        surfaceContainerHighest = SurfaceContainerHighestLight,
    )

private val DarkScheme =
    darkColorScheme(
        primary = PrimaryDark,
        onPrimary = OnPrimaryDark,
        primaryContainer = PrimaryContainerDark,
        onPrimaryContainer = OnPrimaryContainerDark,
        secondary = SecondaryDark,
        onSecondary = OnSecondaryDark,
        secondaryContainer = SecondaryContainerDark,
        onSecondaryContainer = OnSecondaryContainerDark,
        tertiary = TertiaryDark,
        onTertiary = OnTertiaryDark,
        tertiaryContainer = TertiaryContainerDark,
        onTertiaryContainer = OnTertiaryContainerDark,
        error = ErrorDark,
        onError = OnErrorDark,
        errorContainer = ErrorContainerDark,
        onErrorContainer = OnErrorContainerDark,
        background = BackgroundDark,
        onBackground = OnBackgroundDark,
        surface = SurfaceDark,
        onSurface = OnSurfaceDark,
        surfaceVariant = SurfaceVariantDark,
        onSurfaceVariant = OnSurfaceVariantDark,
        outline = OutlineDark,
        outlineVariant = OutlineVariantDark,
        scrim = ScrimDark,
        inverseSurface = InverseSurfaceDark,
        inverseOnSurface = InverseOnSurfaceDark,
        inversePrimary = InversePrimaryDark,
        surfaceDim = SurfaceDimDark,
        surfaceBright = SurfaceBrightDark,
        surfaceContainerLowest = SurfaceContainerLowestDark,
        surfaceContainerLow = SurfaceContainerLowDark,
        surfaceContainer = SurfaceContainerDark,
        surfaceContainerHigh = SurfaceContainerHighDark,
        surfaceContainerHighest = SurfaceContainerHighestDark,
    )

private val MediumContrastLightColorScheme =
    lightColorScheme(
        primary = PrimaryLightMediumContrast,
        onPrimary = OnPrimaryLightMediumContrast,
        primaryContainer = PrimaryContainerLightMediumContrast,
        onPrimaryContainer = OnPrimaryContainerLightMediumContrast,
        secondary = SecondaryLightMediumContrast,
        onSecondary = OnSecondaryLightMediumContrast,
        secondaryContainer = SecondaryContainerLightMediumContrast,
        onSecondaryContainer = OnSecondaryContainerLightMediumContrast,
        tertiary = TertiaryLightMediumContrast,
        onTertiary = OnTertiaryLightMediumContrast,
        tertiaryContainer = TertiaryContainerLightMediumContrast,
        onTertiaryContainer = OnTertiaryContainerLightMediumContrast,
        error = ErrorLightMediumContrast,
        onError = OnErrorLightMediumContrast,
        errorContainer = ErrorContainerLightMediumContrast,
        onErrorContainer = OnErrorContainerLightMediumContrast,
        background = BackgroundLightMediumContrast,
        onBackground = OnBackgroundLightMediumContrast,
        surface = SurfaceLightMediumContrast,
        onSurface = OnSurfaceLightMediumContrast,
        surfaceVariant = SurfaceVariantLightMediumContrast,
        onSurfaceVariant = OnSurfaceVariantLightMediumContrast,
        outline = OutlineLightMediumContrast,
        outlineVariant = OutlineVariantLightMediumContrast,
        scrim = ScrimLightMediumContrast,
        inverseSurface = InverseSurfaceLightMediumContrast,
        inverseOnSurface = InverseOnSurfaceLightMediumContrast,
        inversePrimary = InversePrimaryLightMediumContrast,
        surfaceDim = SurfaceDimLightMediumContrast,
        surfaceBright = SurfaceBrightLightMediumContrast,
        surfaceContainerLowest = SurfaceContainerLowestLightMediumContrast,
        surfaceContainerLow = SurfaceContainerLowLightMediumContrast,
        surfaceContainer = SurfaceContainerLightMediumContrast,
        surfaceContainerHigh = SurfaceContainerHighLightMediumContrast,
        surfaceContainerHighest = SurfaceContainerHighestLightMediumContrast,
    )

private val HighContrastLightColorScheme =
    lightColorScheme(
        primary = PrimaryLightHighContrast,
        onPrimary = OnPrimaryLightHighContrast,
        primaryContainer = PrimaryContainerLightHighContrast,
        onPrimaryContainer = OnPrimaryContainerLightHighContrast,
        secondary = SecondaryLightHighContrast,
        onSecondary = OnSecondaryLightHighContrast,
        secondaryContainer = SecondaryContainerLightHighContrast,
        onSecondaryContainer = OnSecondaryContainerLightHighContrast,
        tertiary = TertiaryLightHighContrast,
        onTertiary = OnTertiaryLightHighContrast,
        tertiaryContainer = TertiaryContainerLightHighContrast,
        onTertiaryContainer = OnTertiaryContainerLightHighContrast,
        error = ErrorLightHighContrast,
        onError = OnErrorLightHighContrast,
        errorContainer = ErrorContainerLightHighContrast,
        onErrorContainer = OnErrorContainerLightHighContrast,
        background = BackgroundLightHighContrast,
        onBackground = OnBackgroundLightHighContrast,
        surface = SurfaceLightHighContrast,
        onSurface = OnSurfaceLightHighContrast,
        surfaceVariant = SurfaceVariantLightHighContrast,
        onSurfaceVariant = OnSurfaceVariantLightHighContrast,
        outline = OutlineLightHighContrast,
        outlineVariant = OutlineVariantLightHighContrast,
        scrim = ScrimLightHighContrast,
        inverseSurface = InverseSurfaceLightHighContrast,
        inverseOnSurface = InverseOnSurfaceLightHighContrast,
        inversePrimary = InversePrimaryLightHighContrast,
        surfaceDim = SurfaceDimLightHighContrast,
        surfaceBright = SurfaceBrightLightHighContrast,
        surfaceContainerLowest = SurfaceContainerLowestLightHighContrast,
        surfaceContainerLow = SurfaceContainerLowLightHighContrast,
        surfaceContainer = SurfaceContainerLightHighContrast,
        surfaceContainerHigh = SurfaceContainerHighLightHighContrast,
        surfaceContainerHighest = SurfaceContainerHighestLightHighContrast,
    )

private val MediumContrastDarkColorScheme =
    darkColorScheme(
        primary = PrimaryDarkMediumContrast,
        onPrimary = OnPrimaryDarkMediumContrast,
        primaryContainer = PrimaryContainerDarkMediumContrast,
        onPrimaryContainer = OnPrimaryContainerDarkMediumContrast,
        secondary = SecondaryDarkMediumContrast,
        onSecondary = OnSecondaryDarkMediumContrast,
        secondaryContainer = SecondaryContainerDarkMediumContrast,
        onSecondaryContainer = OnSecondaryContainerDarkMediumContrast,
        tertiary = TertiaryDarkMediumContrast,
        onTertiary = OnTertiaryDarkMediumContrast,
        tertiaryContainer = TertiaryContainerDarkMediumContrast,
        onTertiaryContainer = OnTertiaryContainerDarkMediumContrast,
        error = ErrorDarkMediumContrast,
        onError = OnErrorDarkMediumContrast,
        errorContainer = ErrorContainerDarkMediumContrast,
        onErrorContainer = OnErrorContainerDarkMediumContrast,
        background = BackgroundDarkMediumContrast,
        onBackground = OnBackgroundDarkMediumContrast,
        surface = SurfaceDarkMediumContrast,
        onSurface = OnSurfaceDarkMediumContrast,
        surfaceVariant = SurfaceVariantDarkMediumContrast,
        onSurfaceVariant = OnSurfaceVariantDarkMediumContrast,
        outline = OutlineDarkMediumContrast,
        outlineVariant = OutlineVariantDarkMediumContrast,
        scrim = ScrimDarkMediumContrast,
        inverseSurface = InverseSurfaceDarkMediumContrast,
        inverseOnSurface = InverseOnSurfaceDarkMediumContrast,
        inversePrimary = InversePrimaryDarkMediumContrast,
        surfaceDim = SurfaceDimDarkMediumContrast,
        surfaceBright = SurfaceBrightDarkMediumContrast,
        surfaceContainerLowest = SurfaceContainerLowestDarkMediumContrast,
        surfaceContainerLow = SurfaceContainerLowDarkMediumContrast,
        surfaceContainer = SurfaceContainerDarkMediumContrast,
        surfaceContainerHigh = SurfaceContainerHighDarkMediumContrast,
        surfaceContainerHighest = SurfaceContainerHighestDarkMediumContrast,
    )

private val HighContrastDarkColorScheme =
    darkColorScheme(
        primary = PrimaryDarkHighContrast,
        onPrimary = OnPrimaryDarkHighContrast,
        primaryContainer = PrimaryContainerDarkHighContrast,
        onPrimaryContainer = OnPrimaryContainerDarkHighContrast,
        secondary = SecondaryDarkHighContrast,
        onSecondary = OnSecondaryDarkHighContrast,
        secondaryContainer = SecondaryContainerDarkHighContrast,
        onSecondaryContainer = OnSecondaryContainerDarkHighContrast,
        tertiary = TertiaryDarkHighContrast,
        onTertiary = OnTertiaryDarkHighContrast,
        tertiaryContainer = TertiaryContainerDarkHighContrast,
        onTertiaryContainer = OnTertiaryContainerDarkHighContrast,
        error = ErrorDarkHighContrast,
        onError = OnErrorDarkHighContrast,
        errorContainer = ErrorContainerDarkHighContrast,
        onErrorContainer = OnErrorContainerDarkHighContrast,
        background = BackgroundDarkHighContrast,
        onBackground = OnBackgroundDarkHighContrast,
        surface = SurfaceDarkHighContrast,
        onSurface = OnSurfaceDarkHighContrast,
        surfaceVariant = SurfaceVariantDarkHighContrast,
        onSurfaceVariant = OnSurfaceVariantDarkHighContrast,
        outline = OutlineDarkHighContrast,
        outlineVariant = OutlineVariantDarkHighContrast,
        scrim = ScrimDarkHighContrast,
        inverseSurface = InverseSurfaceDarkHighContrast,
        inverseOnSurface = InverseOnSurfaceDarkHighContrast,
        inversePrimary = InversePrimaryDarkHighContrast,
        surfaceDim = SurfaceDimDarkHighContrast,
        surfaceBright = SurfaceBrightDarkHighContrast,
        surfaceContainerLowest = SurfaceContainerLowestDarkHighContrast,
        surfaceContainerLow = SurfaceContainerLowDarkHighContrast,
        surfaceContainer = SurfaceContainerDarkHighContrast,
        surfaceContainerHigh = SurfaceContainerHighDarkHighContrast,
        surfaceContainerHighest = SurfaceContainerHighestDarkHighContrast,
    )

@Immutable
data class ColorFamily(
    val color: Color,
    val onColor: Color,
    val colorContainer: Color,
    val onColorContainer: Color,
)

@Immutable
data class ExtendedColorScheme(
    val customColor1: ColorFamily,
    val customColor2: ColorFamily,
)

val ExtendedLight =
    ExtendedColorScheme(
        customColor1 =
            ColorFamily(
                CustomColor1Light,
                OnCustomColor1Light,
                CustomColor1ContainerLight,
                OnCustomColor1ContainerLight,
            ),
        customColor2 =
            ColorFamily(
                CustomColor2Light,
                OnCustomColor2Light,
                CustomColor2ContainerLight,
                OnCustomColor2ContainerLight,
            ),
    )

val ExtendedDark =
    ExtendedColorScheme(
        customColor1 =
            ColorFamily(
                CustomColor1Dark,
                OnCustomColor1Dark,
                CustomColor1ContainerDark,
                OnCustomColor1ContainerDark,
            ),
        customColor2 =
            ColorFamily(
                CustomColor2Dark,
                OnCustomColor2Dark,
                CustomColor2ContainerDark,
                OnCustomColor2ContainerDark,
            ),
    )

val LocalExtendedColors =
    staticCompositionLocalOf {
        ExtendedColorScheme(
            customColor1 =
                ColorFamily(Color.Unspecified, Color.Unspecified, Color.Unspecified, Color.Unspecified),
            customColor2 =
                ColorFamily(Color.Unspecified, Color.Unspecified, Color.Unspecified, Color.Unspecified),
        )
    }

/** Selects among the Material Theme Builder contrast variants of the Spresso palette. */
enum class ContrastLevel {
    STANDARD,
    MEDIUM,
    HIGH,
}

@Composable
expect fun PlatformTheme(
    useDarkTheme: Boolean,
    content: @Composable (ColorScheme?) -> Unit,
)

@Composable
fun AppTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    contrastLevel: ContrastLevel = ContrastLevel.STANDARD,
    content: @Composable () -> Unit,
) {
    val isSystemDark = isSystemInDarkTheme()
    val useDarkTheme =
        when (themeMode) {
            ThemeMode.LIGHT -> false
            ThemeMode.DARK -> true
            ThemeMode.SYSTEM -> isSystemDark
        }

    PlatformTheme(useDarkTheme) { dynamicColorScheme ->
        val colors =
            dynamicColorScheme
                ?: when {
                    useDarkTheme &&
                        contrastLevel == ContrastLevel.HIGH -> HighContrastDarkColorScheme
                    useDarkTheme &&
                        contrastLevel == ContrastLevel.MEDIUM -> MediumContrastDarkColorScheme
                    useDarkTheme -> DarkScheme
                    contrastLevel == ContrastLevel.HIGH -> HighContrastLightColorScheme
                    contrastLevel == ContrastLevel.MEDIUM -> MediumContrastLightColorScheme
                    else -> LightScheme
                }
        val extendedColors = if (useDarkTheme) ExtendedDark else ExtendedLight

        MaterialTheme(
            colorScheme = colors,
            typography = appTypography(),
        ) {
            CompositionLocalProvider(
                LocalExtendedColors provides extendedColors,
                content = content,
            )
        }
    }
}
