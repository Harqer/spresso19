package components.features.wardrobe

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.models.*
import components.shared.widgets.MediaActionCard
import io.ktor.client.HttpClient

@Composable
fun WardrobeItemCard(
    title: String,
    category: String,
    imageUrl: String?,
    httpClient: HttpClient,
    ratingText: String = "4.8",
    onItemClick: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    MediaActionCard(
        imageUrl = imageUrl ?: "",
        title = title,
        subtitle = category,
        onClick = onItemClick,
        actionRow = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Default.Star, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(16.dp))
                Text(ratingText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        modifier = modifier,
        trackingId = "wardrobe_item_card",
        trackingAction = "click_item_$title",
    )
}
