package components.features.chat

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.models.*
import io.ktor.client.HttpClient
import network.ProductItem

@Composable
fun ChatProductCard(
    product: ProductItem,
    onAddToCart: (ProductItem) -> Unit = { },
    onSelectTryOn: (ProductItem) -> Unit = { },
    httpClient: HttpClient? = null,
    modifier: Modifier = Modifier,
) {
    components.shared.widgets.MediaActionCard(
        imageUrl = product.imageUrl,
        title = product.name,
        subtitle = "${product.brand.uppercase()} • $${product.price}",
        modifier = modifier,
        onClick = null,
        actionRow = {
            components.shared.elements.SpressoButton(
                text = "Try On",
                icon = Icons.Default.AutoAwesome,
                variant = components.shared.elements.SpressoButtonVariant.OUTLINE,
                onClick = { onSelectTryOn(product) },
                modifier = Modifier.weight(1f),
                trackingId = product.id,
                trackingAction = "try_on",
            )
            components.shared.elements.SpressoButton(
                text = "Buy Now",
                icon = Icons.Default.AddShoppingCart,
                variant = components.shared.elements.SpressoButtonVariant.PRIMARY,
                onClick = { onAddToCart(product) },
                modifier = Modifier.weight(1f),
                trackingId = product.id,
                trackingAction = "buy_now",
            )
        },
        trackingId = product.id,
        trackingAction = "view_product",
    )
}
