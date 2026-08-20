package components.shared.widgets

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CardElevation
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import components.core.NetworkImage

import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import network.ApiClient
import components.shared.elements.ReactionBadge
import components.shared.widgets.ExpressiveReactionPalette

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MediaActionCard(
    imageUrl: String,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    imageBytes: ByteArray? = null,
    onClick: (() -> Unit)? = null,
    badgeContent: (@Composable () -> Unit)? = null,
    actionRow: (@Composable RowScope.() -> Unit)? = null,
    trackingId: String? = null,
    trackingAction: String? = null
) {
    val coroutineScope = rememberCoroutineScope()
    val apiClient = remember { ApiClient() }
    var showReactionPalette by remember { mutableStateOf(false) }
    var selectedReaction by remember { mutableStateOf<ImageVector?>(null) }

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
            .combinedClickable(
                onClick = { trackedOnClick?.invoke() },
                onLongClick = { showReactionPalette = true }
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
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
                    modifier = Modifier.fillMaxSize(),
                    fallbackBytes = imageBytes
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
                
                if (selectedReaction != null) {
                    ReactionBadge(
                        icon = selectedReaction!!,
                        modifier = Modifier
                            .padding(8.dp)
                            .align(Alignment.BottomEnd)
                    )
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
            } // Content Area
            } // Outer Column
            
            ExpressiveReactionPalette(
                visible = showReactionPalette,
                onReactionSelected = { icon ->
                    showReactionPalette = false
                    selectedReaction = icon
                    if (trackingId != null) {
                        coroutineScope.launch {
                            apiClient.recordInteraction(trackingId, "reacted_${icon.name}")
                        }
                    }
                },
                modifier = Modifier.align(Alignment.Center)
            )
        }
    }
}
