package components.features.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.models.*
import network.models.SubscriptionTier

@Composable
fun SubscriptionMembershipSection(
    currentTier: SubscriptionTier,
    renewalDate: String?,
    onManageSubscription: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val tierColor =
        when (currentTier) {
            SubscriptionTier.FREE -> MaterialTheme.colorScheme.outline
            SubscriptionTier.SPRESSO_VIP -> MaterialTheme.colorScheme.primary
            SubscriptionTier.CHEF_PRO -> MaterialTheme.colorScheme.tertiary
        }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(
                        imageVector = Icons.Outlined.Star,
                        contentDescription = null,
                        tint = tierColor,
                    )
                    Text(
                        text = "Membership & Subscription",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(
                    text = currentTier.displayName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = tierColor,
                )
            }

            Text(
                text =
                    when (currentTier) {
                        SubscriptionTier.FREE -> "Upgrade to Spresso VIP for free shipping and priority AI recommendations."
                        SubscriptionTier.SPRESSO_VIP -> "Enjoy unlimited free delivery, 5% cashback on grocery plans, and 24/7 AI shopping support."
                        SubscriptionTier.CHEF_PRO -> "Get full cooking help, grocery planning, and shopping support."
                    },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (renewalDate != null) {
                Text(
                    text = "Next billing cycle: $renewalDate",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                )
            }

            Button(
                onClick = { onManageSubscription?.invoke() },
                modifier = Modifier.fillMaxWidth().height(44.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            ) {
                Text(
                    text = if (currentTier == SubscriptionTier.FREE) "Upgrade to Spresso VIP" else "Manage Plan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )
            }
        }
    }
}
