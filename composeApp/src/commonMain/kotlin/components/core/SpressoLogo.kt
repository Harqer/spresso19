package components.core

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.painterResource
import spresso.composeapp.generated.resources.Res
import spresso.composeapp.generated.resources.logo
import spresso.composeapp.generated.resources.logo_icon_transparent

enum class LogoSize { Small, Medium, Large, ExtraLarge }

@Composable
fun SpressoLogo(
    modifier: Modifier = Modifier,
    size: LogoSize = LogoSize.Medium,
    showText: Boolean = true
) {
    val height = when (size) {
        LogoSize.Small -> 36.dp
        LogoSize.Medium -> 56.dp
        LogoSize.Large -> 112.dp
        LogoSize.ExtraLarge -> 180.dp
    }
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        val painter = if (showText) {
            painterResource(Res.drawable.logo)
        } else {
            painterResource(Res.drawable.logo_icon_transparent)
        }
        
        Image(
            painter = painter,
            contentDescription = "Spresso Logo",
            modifier = Modifier.height(height),
            contentScale = ContentScale.Fit
        )
    }
}
