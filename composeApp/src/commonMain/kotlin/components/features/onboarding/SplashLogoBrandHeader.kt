package components.features.onboarding

import components.models.*

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.unit.sp
import components.core.LogoSize
import components.core.SpressoLogo

@Composable
fun SplashLogoBrandHeader(
    modifier: Modifier = Modifier,
    titleText: String = "SPRESSO",
    subtitleText: String = "AI COMMERCE INTELLIGENCE"
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        SpressoLogo(
            size = LogoSize.Large,
            showText = true
        )

        Text(
            text = subtitleText,
            fontSize = 12.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 2.sp,
            color = MaterialTheme.colorScheme.primary
        )
    }
}
