package components.organisms

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Recommend
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.atoms.NetworkImage
import io.ktor.client.HttpClient
import network.ProductItem

@Composable
fun AICurationFeed(
    curatedProducts: List<ProductItem>,
    httpClient: HttpClient,
    onTryOnRequested: (ProductItem) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(Color(0xFF18211E), Color(0xFF0F1715))
                )
            )
            .border(1.dp, Color(0xFF2E3D38), RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        // High-Fidelity Glow Effect (Web Parity)
        Box(
            modifier = Modifier
                .size(200.dp)
                .align(Alignment.TopEnd)
                .offset(x = 100.dp, y = (-100).dp)
                .background(Color(0xFF10B981).copy(alpha = 0.08f), CircleShape)
        )

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    color = Color(0xFF059669),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        "AI CURATION FEED",
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Recommend, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                    Text("Personalized For You", color = Color(0xFF34D399), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }

            Text(
                text = "Based on your recent search history and likes:",
                color = Color(0xFF9CA3AF),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(curatedProducts) { product ->
                    Surface(
                        modifier = Modifier
                            .width(220.dp)
                            .clickable { onTryOnRequested(product) },
                        color = Color.White.copy(alpha = 0.04f),
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            NetworkImage(
                                url = product.imageUrl,
                                client = httpClient,
                                contentDescription = product.name,
                                modifier = Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    text = product.name, 
                                    color = Color.White, 
                                    fontSize = 12.sp, 
                                    fontWeight = FontWeight.Bold, 
                                    maxLines = 1, 
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "$${product.price}", 
                                    color = Color(0xFF34D399), 
                                    fontSize = 11.sp, 
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                )
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(10.dp))
                                    Text(
                                        text = (product.rating ?: 5.0).toString(), 
                                        color = Color(0xFFFBBF24), 
                                        fontSize = 10.sp, 
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
