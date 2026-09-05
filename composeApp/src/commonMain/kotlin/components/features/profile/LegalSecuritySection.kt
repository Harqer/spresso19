package components.features.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.AssignmentReturn
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Policy
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.models.*

@Composable
fun LegalSecuritySection(
    onShowRefundPolicy: (() -> Unit)? = null,
    onShowPlayPolicy: (() -> Unit)? = null,
    onShowPrivacyTerms: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    var unavailableMessage by remember { mutableStateOf<String?>(null) }
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(imageVector = Icons.Outlined.Security, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text("Legal & Play Policies", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            }

            ProfileListItem(
                icon = Icons.AutoMirrored.Outlined.AssignmentReturn,
                title = "Refunds & Return Policy",
                subtitle = "30-day money-back guarantee details",
                onClick = onShowRefundPolicy ?: { unavailableMessage = "The refunds and returns policy is unavailable right now." },
            )

            ProfileListItem(
                icon = Icons.Outlined.Gavel,
                title = "App policies",
                subtitle = "Review store and service policies",
                onClick = onShowPlayPolicy ?: { unavailableMessage = "App policies are unavailable right now." },
            )

            ProfileListItem(
                icon = Icons.Outlined.Policy,
                title = "Privacy Statement & Terms",
                subtitle = "How Spresso protects and uses your information",
                onClick = onShowPrivacyTerms ?: { unavailableMessage = "Privacy and terms are unavailable right now." },
            )

            unavailableMessage?.let { message ->
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}
