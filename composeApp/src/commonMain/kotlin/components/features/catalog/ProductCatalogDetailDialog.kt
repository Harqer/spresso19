package components.features.catalog

import components.models.*

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant
import network.ProductItem

@Composable
fun ProductCatalogDetailDialog(
    product: ProductItem,
    checkoutStatus: String?,
    onDismiss: () -> Unit,
    onTryOn: (ProductItem) -> Unit,
    onSpin360: (String) -> Unit,
    onLike: () -> Unit,
    onShare: (String) -> Unit,
    onBuyNow: (String) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(product.name) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("${product.brand} • $${product.price}", style = MaterialTheme.typography.titleMedium)
                if (checkoutStatus != null) {
                    Text(checkoutStatus, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                }
                
                SpressoButton(
                    text = "Virtual Try-On",
                    onClick = { onTryOn(product) },
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    trackingId = "detail_tryon_${product.id}",
                    trackingAction = "click_tryon"
                )
                Text(
                    text = "See how this product looks on you using our AI draping engine.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp, start = 4.dp, end = 4.dp)
                )
                
                SpressoButton(
                    text = "Spin 360",
                    onClick = { onSpin360(product.id) },
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    trackingId = "detail_spin360_${product.id}",
                    trackingAction = "click_spin360"
                )
                Text(
                    text = "Rotate the product in high fidelity 3D space powered by Veo.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp, start = 4.dp, end = 4.dp)
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SpressoButton(
                        text = "Like",
                        onClick = onLike,
                        modifier = Modifier.weight(1f),
                        variant = SpressoButtonVariant.SECONDARY,
                        trackingId = "detail_like_${product.id}",
                        trackingAction = "click_like"
                    )
                    SpressoButton(
                        text = "Share",
                        onClick = { onShare(product.name) },
                        modifier = Modifier.weight(1f),
                        variant = SpressoButtonVariant.SECONDARY,
                        trackingId = "detail_share_${product.id}",
                        trackingAction = "click_share"
                    )
                }
            }
        },
        confirmButton = {
            SpressoButton(
                text = "1-Tap Buy Now",
                onClick = { onBuyNow(product.id) },
                icon = Icons.Default.ShoppingCart,
                trackingId = "detail_buy_${product.id}",
                trackingAction = "click_1tap_buy"
            )
        },
        dismissButton = {
            SpressoButton(
                text = "Close",
                onClick = onDismiss,
                variant = SpressoButtonVariant.GHOST,
                trackingId = "detail_close_${product.id}",
                trackingAction = "click_close_dialog"
            )
        }
    )
}
