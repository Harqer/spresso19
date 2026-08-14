package components.features.chat

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.core.NetworkImage
import io.ktor.client.HttpClient
import network.ProductItem

@Composable
fun ChatProductCard(
    product: ProductItem,
    onAddToCart: (ProductItem) -> Unit = {},
    onSelectTryOn: (ProductItem) -> Unit = {},
    httpClient: HttpClient? = null,
    modifier: Modifier = Modifier
) {
    components.molecules.MediaActionCard(
        imageUrl = product.imageUrl,
        title = product.name,
        subtitle = "${product.brand.uppercase()} • $${product.price}",
        modifier = modifier,
        onClick = null,
        badgeContent = null,
        actionRow = {
            components.atoms.SpressoButton(
                text = "Try On",
                icon = Icons.Default.AutoAwesome,
                variant = components.atoms.SpressoButtonVariant.OUTLINE,
                onClick = { onSelectTryOn(product) },
                modifier = Modifier.weight(1f).height(36.dp),
                trackingId = product.id,
                trackingAction = "try_on"
            )
            components.atoms.SpressoButton(
                text = "Buy Now",
                icon = Icons.Default.AddShoppingCart,
                variant = components.atoms.SpressoButtonVariant.PRIMARY,
                onClick = { onAddToCart(product) },
                modifier = Modifier.weight(1f).height(36.dp),
                trackingId = product.id,
                trackingAction = "buy_now"
            )
        },
        trackingId = product.id,
        trackingAction = "view_product"
    )
}

