package theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import org.jetbrains.compose.resources.Font
import spresso.composeapp.generated.resources.Res
import spresso.composeapp.generated.resources.albert_sans
import spresso.composeapp.generated.resources.instrument_serif

// Web actual: the same brand faces as Android (Albert Sans / Instrument Serif),
// served from bundled OFL TTFs in composeResources. The variable font registers
// its named weight axes so intermediate weights resolve on the same face.
@Composable
actual fun editorialSansFontFamily(): FontFamily =
    FontFamily(
        Font(
            resource = Res.font.albert_sans,
            weight = FontWeight.Normal,
        ),
        Font(
            resource = Res.font.albert_sans,
            weight = FontWeight.Medium,
        ),
        Font(
            resource = Res.font.albert_sans,
            weight = FontWeight.SemiBold,
        ),
        Font(
            resource = Res.font.albert_sans,
            weight = FontWeight.Bold,
        ),
    )

@Composable
actual fun editorialSerifFontFamily(): FontFamily =
    FontFamily(
        Font(
            resource = Res.font.instrument_serif,
            weight = FontWeight.Normal,
        ),
    )
