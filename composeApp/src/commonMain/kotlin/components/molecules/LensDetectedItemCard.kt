package components.molecules

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import components.atoms.ProductPriceTag
import network.DetectedItem

@Composable
fun LensDetectedItemCard(
    item: DetectedItem,
    onSelectProduct: (String) -> Unit,
    onTapBuy: (DetectedItem) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {
                contentDescription = "Detected product: ${item.detectedName}, brand: ${item.brandGuess.ifBlank { "Spresso" }}, price: \$${item.priceEstimate}"
            }
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(item.brandGuess.ifBlank { "Spresso" }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, "Star rating", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(2.dp))
                    Text("4.8", style = MaterialTheme.typography.labelSmall)
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(item.detectedName, style = MaterialTheme.typography.titleSmall, maxLines = 1)
            item.buyActionPrompt?.let { prompt ->
                if (prompt.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(prompt, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, maxLines = 2)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                ProductPriceTag(price = item.priceEstimate)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(
                        onClick = { onSelectProduct(item.detectedName) },
                        modifier = Modifier.semantics(mergeDescendants = true) {
                            contentDescription = "View product details for ${item.detectedName}"
                        }
                    ) {
                        Icon(Icons.Default.ShoppingBag, "View Product Details")
                    }
                    Button(
                        onClick = { onTapBuy(item) },
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 4.dp),
                        modifier = Modifier
                            .height(36.dp)
                            .semantics(mergeDescendants = true) {
                                contentDescription = "1-Tap Buy ${item.detectedName} for \$${item.priceEstimate}"
                            }
                    ) {
                        Icon(Icons.Default.Bolt, "1-Tap Buy", modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(2.dp))
                        Text("1-Tap Buy", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}
