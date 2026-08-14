package components.features.profile

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.profile.ProfileListItem

@Composable
fun PreferencesSection(
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    notificationsEnabled: Boolean,
    onToggleNotifications: (Boolean) -> Unit,
    emailAlertsEnabled: Boolean,
    onToggleEmailAlerts: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(imageVector = Icons.Outlined.Settings, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text("App Preferences", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            }

            ProfileListItem(
                icon = if (isDarkTheme) Icons.Outlined.DarkMode else Icons.Outlined.LightMode,
                title = "Appearance Theme",
                subtitle = if (isDarkTheme) "Dark Mode active" else "Light Mode active",
                trailingContent = {
                    Switch(
                        checked = isDarkTheme,
                        onCheckedChange = { onToggleTheme() }
                    )
                }
            )

            ProfileListItem(
                icon = Icons.Outlined.Notifications,
                title = "Push Notifications",
                subtitle = "Order updates and price drop alerts",
                trailingContent = {
                    Switch(
                        checked = notificationsEnabled,
                        onCheckedChange = onToggleNotifications
                    )
                }
            )

            ProfileListItem(
                icon = Icons.Outlined.Notifications,
                title = "Email Summaries",
                subtitle = "Weekly Bargain Chef AI recipe recommendations",
                trailingContent = {
                    Switch(
                        checked = emailAlertsEnabled,
                        onCheckedChange = onToggleEmailAlerts
                    )
                }
            )
        }
    }
}
