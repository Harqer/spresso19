package components.atoms

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp

@Composable
fun SpressoLogo(
    modifier: Modifier = Modifier,
    size: LogoSize = LogoSize.Medium
) {
    val height = when (size) {
        LogoSize.Small -> 28.dp
        LogoSize.Medium -> 42.dp
        LogoSize.Large -> 84.dp
        LogoSize.ExtraLarge -> 140.dp
    }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        // High-Fidelity Brand Logo with Text
        Image(
            painter = rememberBrandLogoPainter(),
            contentDescription = "Spresso Logo",
            modifier = Modifier.height(height),
            contentScale = ContentScale.Fit
        )
    }
}

enum class LogoSize {
    Small, Medium, Large, ExtraLarge
}
