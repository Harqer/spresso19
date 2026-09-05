package components.features.wardrobe

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import network.ProductItem
import network.SpressoBackend

data class ComposeWardrobeDeck(
    val id: String,
    val title: String,
    val subtitle: String,
    val products: List<ProductItem>,
)

@Composable
fun StackedWardrobeDecks(
    products: List<ProductItem>,
    likedProducts: List<ProductItem> = emptyList(),
    onSelectTryOn: (ProductItem) -> Unit,
    onOpenUploadModal: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var expandedDeckId by remember { mutableStateOf<String?>(null) }
    var decks by remember { mutableStateOf<List<ComposeWardrobeDeck>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(products) {
        isLoading = true
        errorMessage = null
        try {
            val wardrobeDecks =
                SpressoBackend.getWardrobeOutfits().map { outfit ->
                    ComposeWardrobeDeck(
                        id = outfit.id,
                        title = outfit.title,
                        subtitle = outfit.description.orEmpty(),
                        products =
                            outfit.items.map { item ->
                                ProductItem(
                                    id = item.id,
                                    name = item.brand?.takeIf { it.isNotBlank() } ?: item.category,
                                    brand = item.brand.orEmpty(),
                                    category = item.category,
                                    price = null,
                                    imageUrl = item.imageUrl,
                                )
                            },
                    )
                }
            decks =
                wardrobeDecks +
                    if (products.isNotEmpty()) {
                        listOf(
                            ComposeWardrobeDeck(
                                id = "recommendations",
                                title = "Recommended for you",
                                subtitle = "Products selected from your live recommendations",
                                products = products,
                            ),
                        )
                    } else {
                        emptyList()
                    } +
                    if (likedProducts.isNotEmpty()) {
                        listOf(
                            ComposeWardrobeDeck(
                                id = "liked",
                                title = "Your liked styles",
                                subtitle = "Liked pieces to inspire your outfit",
                                products = likedProducts,
                            ),
                        )
                    } else {
                        emptyList()
                    }
            expandedDeckId = decks.firstOrNull()?.id
        } catch (e: Exception) {
            errorMessage = "Unable to load your wardrobe collections. Please try again."
        } finally {
            isLoading = false
        }
    }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Row(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                    Text("Wardrobe collections", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Choose a collection to explore outfits and try on individual items.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Button(onClick = onOpenUploadModal, shape = RoundedCornerShape(8.dp)) {
                    Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Add look")
                }
            }
        }

        when {
            isLoading -> Text("Loading your wardrobe…", style = MaterialTheme.typography.bodyMedium)
            errorMessage != null -> Text(errorMessage!!, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
            decks.isEmpty() -> Text(
                "No wardrobe collections yet. Add a look to start building your wardrobe.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        decks.forEach { deck ->
            val isExpanded = expandedDeckId == deck.id
            Card(
                modifier = Modifier.fillMaxWidth().clickable { expandedDeckId = if (isExpanded) null else deck.id },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(Icons.Default.Style, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Column(modifier = Modifier.weight(1f, fill = false)) {
                                Text(deck.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyLarge)
                                if (deck.subtitle.isNotBlank()) {
                                    Text(deck.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(
                                    "${deck.products.size} ${if (deck.products.size == 1) "item" else "items"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Icon(
                            if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = if (isExpanded) "Collapse collection" else "Expand collection",
                        )
                    }

                    AnimatedVisibility(visible = isExpanded) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            deck.products.forEach { product ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(product.name, fontWeight = FontWeight.SemiBold)
                                        Text(
                                            listOfNotNull(
                                                product.brand.takeIf { it.isNotBlank() },
                                                product.price?.let { "$${it}" },
                                            ).joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        product.rating?.takeIf { it > 0.0 }?.let { rating ->
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Icon(Icons.Default.Star, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(16.dp))
                                                Text(rating.toString(), style = MaterialTheme.typography.bodySmall)
                                            }
                                        }
                                    }
                                    TextButton(onClick = { onSelectTryOn(product) }, shape = RoundedCornerShape(8.dp)) {
                                        Text("Try on")
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
