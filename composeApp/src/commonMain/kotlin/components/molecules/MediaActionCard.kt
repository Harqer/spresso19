package components.molecules

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import components.core.NetworkImage

import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import network.ApiClient

@Composable
fun MediaActionCard(
    imageUrl: String,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
    badgeContent: (@Composable () -> Unit)? = null,
    actionRow: (@Composable RowScope.() -> Unit)? = null,
    trackingId: String? = null,
    trackingAction: String? = null
) {
    val coroutineScope = rememberCoroutineScope()
    val apiClient = ApiClient()

    val trackedOnClick: (() -> Unit)? = onClick?.let { clickAction ->
        {
            if (trackingId != null && trackingAction != null) {
                coroutineScope.launch {
                    apiClient.recordInteraction(trackingId, trackingAction)
                }
            }
            clickAction()
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .then(if (trackedOnClick != null) Modifier.clickable { trackedOnClick() } else Modifier),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column {
            // Media Area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f) // Square image by default, can be overridden by modifier in caller
            ) {
                NetworkImage(
                    url = imageUrl,
                    client = apiClient.client,
                    contentDescription = title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                
                if (badgeContent != null) {
                    Box(
                        modifier = Modifier
                            .padding(8.dp)
                            .align(Alignment.TopEnd)
                    ) {
                        badgeContent()
                    }
                }
            }

            // Content Area
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                if (subtitle != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                if (actionRow != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        content = actionRow
                    )
                }
            }
        }
    }
}
