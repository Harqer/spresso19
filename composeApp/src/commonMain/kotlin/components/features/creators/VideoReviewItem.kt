package components.features.creators

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class ReviewVideoModel(
    val id: String,
    val authorName: String,
    val rating: Float,
    val commentText: String,
    val thumbnailUrl: String,
    val videoUrl: String
)

@Composable
fun VideoReviewItem(
    review: ReviewVideoModel,
    modifier: Modifier = Modifier
) {
    var isPlaying by remember { mutableStateOf(false) }

    DisposableEffect(review.id) {
        onDispose { isPlaying = false }
    }

    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(text = review.authorName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.Star, contentDescription = "Rating", tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(2.dp))
                Text(text = "${review.rating}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            }
        }
        Text(text = review.commentText, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)

        Box(
            modifier = Modifier.fillMaxWidth().height(180.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.onSurface).clickable { isPlaying = !isPlaying },
            contentAlignment = Alignment.Center
        ) {
            Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(if (isPlaying) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)), contentAlignment = Alignment.Center) {
                Icon(imageVector = Icons.Default.PlayArrow, contentDescription = if (isPlaying) "Playing Video" else "Play Video", tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(28.dp))
            }
            if (!isPlaying) {
                Text(text = "TAP TO PLAY VIDEO REVIEW", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.surface, modifier = Modifier.align(Alignment.BottomStart).padding(10.dp))
            }
        }
    }
}
