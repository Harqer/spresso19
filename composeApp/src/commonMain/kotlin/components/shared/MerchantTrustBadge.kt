package components.shared

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Genkit Merchant Trust Score Badge Molecule (52 lines).
 * Displays store & product trust score (0-100), return handling rating, and customer support accessibility.
 */
@Composable
fun MerchantTrustBadge(
    merchantName: String,
    trustScore: Int = 94,
    riskLevel: String = "LOW_RISK",
    returnsRating: String = "EXCELLENT",
    supportStatus: String = "LIVE_SUPPORT_AVAILABLE",
    modifier: Modifier = Modifier
) {
    val badgeBg = if (trustScore >= 80) MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.errorContainer
    val badgeContentColor = if (trustScore >= 80) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onErrorContainer

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(badgeBg)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = "Merchant Trust Score",
                    tint = badgeContentColor
                )
                Text(
                    text = merchantName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = badgeContentColor
                )
            }

            Text(
                text = "$trustScore/100 Trust",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.ExtraBold,
                color = badgeContentColor,
                fontSize = 14.sp
            )
        }

        Text(
            text = "Returns: $returnsRating • Support: ${supportStatus.replace("_", " ")}",
            style = MaterialTheme.typography.bodySmall,
            color = badgeContentColor.copy(alpha = 0.8f),
            fontSize = 12.sp
        )
    }
}
