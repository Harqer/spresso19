package components.features.chat.molecules

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import network.ApiClient

@Composable
fun DiscoveryCard(
    id: String,
    badge: String,
    isErrorTheme: Boolean,
    icon: ImageVector,
    title: String,
    subtitle: String,
    prompt: String,
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    trackingId: String? = null,
    trackingAction: String? = null
) {
    val coroutineScope = rememberCoroutineScope()
    val apiClient = androidx.compose.runtime.remember { network.ApiClient() }
    val themeColor = if (isErrorTheme) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
    val themeBgColor = if (isErrorTheme) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer

    Surface(
        modifier = modifier.clickable { 
            if (trackingId != null && trackingAction != null) {
                coroutineScope.launch {
                    apiClient.recordInteraction(trackingId, trackingAction)
                }
            }
            onClick(prompt) 
        },
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(20.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = themeBgColor,
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, tint = themeColor, modifier = Modifier.size(18.dp))
                    }
                }
                
                Surface(
                    shape = CircleShape,
                    color = themeBgColor.copy(alpha = 0.5f),
                    border = BorderStroke(1.dp, themeColor.copy(alpha = 0.2f))
                ) {
                    Text(
                        text = badge,
                        color = themeColor,
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, fontWeight = FontWeight.ExtraBold),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp)
                    )
                }
            }
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 14.sp
                )
            }
        }
    }
}
