package components.organisms

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import components.molecules.ProductActions
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
                ProductActions(
                    onVirtualTryOnClick = { onTryOn(product) },
                    onSpin360Click = { onSpin360(product.id) },
                    onLikeClick = onLike,
                    onShareClick = { onShare(product.name) }
                )
            }
        },
        confirmButton = {
            Button(onClick = { onBuyNow(product.id) }) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.ShoppingCart, contentDescription = null)
                    Text("1-Tap Buy Now")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
