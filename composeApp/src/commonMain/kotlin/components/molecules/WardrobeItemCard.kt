package components.molecules

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
import components.atoms.NetworkImage
import io.ktor.client.HttpClient

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
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onItemClick),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD8EBD7)),
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.fillMaxWidth().height(140.dp)) {
                if (imageUrl != null && imageUrl.startsWith("http")) {
                    NetworkImage(url = imageUrl, client = httpClient, contentDescription = title, modifier = Modifier.fillMaxSize())
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Checkroom, contentDescription = null, modifier = Modifier.size(40.dp), tint = Color(0xFF386633))
                    }
                }
                Surface(
                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                    color = Color.Black.copy(alpha = 0.6f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Icon(Icons.Default.Star, null, tint = Color(0xFFFFB300), modifier = Modifier.size(10.dp))
                        Text(ratingText, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Text(category.uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = Color(0xFF386633))
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
