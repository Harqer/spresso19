package theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import com.spresso.shared.R

// Material Theme Builder export: Albert Sans for body/labels/titles,
// Instrument Serif for display/headlines — resolved through the Google Fonts provider.
private val provider =
    GoogleFont.Provider(
        providerAuthority = "com.google.android.gms.fonts",
        providerPackage = "com.google.android.gms",
        certificates = R.array.com_google_android_gms_fonts_certs,
    )

private val bodyGoogleFont = GoogleFont("Albert Sans")
private val displayGoogleFont = GoogleFont("Instrument Serif")

private val bodyFontFamily =
    FontFamily(
        Font(
            googleFont = bodyGoogleFont,
            fontProvider = provider,
            weight = FontWeight.Normal,
        ),
        Font(
            googleFont = bodyGoogleFont,
            fontProvider = provider,
            weight = FontWeight.Medium,
        ),
        Font(
            googleFont = bodyGoogleFont,
            fontProvider = provider,
            weight = FontWeight.SemiBold,
        ),
        Font(
            googleFont = bodyGoogleFont,
            fontProvider = provider,
            weight = FontWeight.Bold,
        ),
    )

private val displayFontFamily =
    FontFamily(
        Font(
            googleFont = displayGoogleFont,
            fontProvider = provider,
            weight = FontWeight.Normal,
        ),
    )

@Composable
actual fun editorialSansFontFamily(): FontFamily = bodyFontFamily

@Composable
actual fun editorialSerifFontFamily(): FontFamily = displayFontFamily
