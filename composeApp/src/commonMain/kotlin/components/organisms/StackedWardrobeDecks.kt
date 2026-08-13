package components.organisms

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.ktor.client.HttpClient
import network.ProductItem

data class ComposeWardrobeDeck(
    val id: String,
    val title: String,
    val subtitle: String,
    val badge: String,
    val icon: ImageVector,
    val itemsCount: Int
)

@Composable
fun StackedWardrobeDecks(
    products: List<ProductItem>,
    httpClient: HttpClient,
    onSelectTryOn: (ProductItem) -> Unit,
    onOpenUploadModal: () -> Unit,
    modifier: Modifier = Modifier
) {
    var expandedDeckId by remember { mutableStateOf<String?>("ai-curated") }

    val decks = remember(products.size) {
        listOf(
            ComposeWardrobeDeck("ai-curated", "AI Curated Smart Fits", "Mixed combinations from Likes & Photo Gallery", "5 AI Outfits", Icons.Default.AutoAwesome, 5),
            ComposeWardrobeDeck("photo-gallery", "Photo Gallery Closet Stack", "Personal clothes uploaded from camera roll", "Gallery Clothes", Icons.Default.PhotoLibrary, 6),
            ComposeWardrobeDeck("liked-stack", "Liked Outfits Deck", "Outfits composed from liked items", "Liked Items", Icons.Default.Favorite, 4),
            ComposeWardrobeDeck("bookmarked-stack", "Bookmarked Shop Stack", "Saved catalog items from Spresso Store", "Bookmarks", Icons.Default.Bookmark, products.size)
        )
    }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            color = Color(0xFF18211E),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2E3D38))
        ) {
            Row(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Style, contentDescription = null, tint = Color(0xFF81C784), modifier = Modifier.size(18.dp))
                        Text("JETPACK MOTION STACK UI", color = Color(0xFF81C784), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    Text("Stacked Wardrobe Decks", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Tap any stacked deck to fan out & explore outfits", color = Color(0xFFB0BEC5), fontSize = 11.sp)
                }

                Button(
                    onClick = onOpenUploadModal,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Add", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        decks.forEach { deck ->
            val isExpanded = expandedDeckId == deck.id
            Card(
                modifier = Modifier.fillMaxWidth().clickable { expandedDeckId = if (isExpanded) null else deck.id },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(if (isExpanded) 1.5.dp else 1.dp, if (isExpanded) Color(0xFF386633) else Color(0xFFD8EBD7))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Surface(color = Color(0xFFE8F3E8), shape = RoundedCornerShape(12.dp), modifier = Modifier.size(40.dp)) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(deck.icon, contentDescription = null, tint = Color(0xFF386633), modifier = Modifier.size(20.dp))
                                }
                            }
                            Column {
                                Text(deck.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                Text(deck.subtitle, style = MaterialTheme.typography.bodySmall, color = Color(0xFF5E635F))
                            }
                        }
                        Icon(
                            if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = null,
                            tint = Color(0xFF386633)
                        )
                    }

                    AnimatedVisibility(visible = isExpanded) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            Text("Fanned-Out Deck Content (${deck.badge})", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF386633))
                            products.take(3).forEach { product ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth().clickable { onSelectTryOn(product) },
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFFF8FAF8),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD8EBD7))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(product.name, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                            Text("$${product.price} • ★ 4.8", fontSize = 10.sp, color = Color(0xFF386633))
                                        }
                                        TextButton(onClick = { onSelectTryOn(product) }) {
                                            Text("Try On", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
