package components.features.wardrobe

import components.models.*

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.core.NetworkImage
import io.ktor.client.HttpClient

import components.shared.widgets.MediaActionCard

@Composable
fun WardrobeItemCard(
    title: String,
    category: String,
    imageUrl: String?,
    httpClient: HttpClient,
    ratingText: String = "★ 4.8",
    onItemClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    MediaActionCard(
        imageUrl = imageUrl ?: "",
        title = title,
        subtitle = category.uppercase(),
        onClick = onItemClick,
        badgeContent = {
            Surface(
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Icon(Icons.Default.Star, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(10.dp))
                    Text(ratingText, color = MaterialTheme.colorScheme.surface, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
        modifier = modifier,
        trackingId = "wardrobe_item_card",
        trackingAction = "click_item_${title}"
    )
}
