package components.atoms

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.painter.Painter
import org.jetbrains.compose.resources.painterResource
import spresso.composeapp.generated.resources.Res
import spresso.composeapp.generated.resources.spresso_brand_logo

@Composable
actual fun rememberBrandLogoPainter(): Painter {
    return painterResource(Res.drawable.spresso_brand_logo)
}
