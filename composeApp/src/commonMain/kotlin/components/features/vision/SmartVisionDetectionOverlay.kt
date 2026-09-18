package components.features.vision

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.shared.widgets.MediaActionCard
import kotlinx.coroutines.launch
import network.ApiClient
import network.DetectedItem
import network.ProductItem
import network.models.HITLChallenge
import network.models.HITLPayload
import network.models.HITLProduct

@Composable
@Suppress("UNUSED_PARAMETER")
fun SmartVisionDetectionOverlay(
    item: DetectedItem,
    matchedProduct: ProductItem?,
    width: Dp,
    height: Dp,
    apiClient: ApiClient,
    onSelectProduct: (String) -> Unit,
    onHitlCheckout: (HITLPayload) -> Unit,
) {
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    var apiError by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<String?>(null) }
    val box = item.boundingBox ?: listOf(0.0, 0.0, 0.0, 0.0)
    val yMin = (box.getOrNull(0) ?: 0.0) / 1000f
    val xMin = (box.getOrNull(1) ?: 0.0) / 1000f
    val yMax = (box.getOrNull(2) ?: 0.0) / 1000f
    val xMax = (box.getOrNull(3) ?: 0.0) / 1000f

    val boxTop = height * yMin.toFloat()
    val boxLeft = width * xMin.toFloat()
    val boxWidth = width * (xMax.toFloat() - xMin.toFloat())
    val boxHeight = height * (yMax.toFloat() - yMin.toFloat())

    Box(
        modifier =
            Modifier
                // The caller supplies the containing Box coordinates.
                .absoluteOffset(x = boxLeft, y = boxTop)
                .size(width = boxWidth, height = boxHeight),
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
        ) {
            val errorMsg = apiError
            if (errorMsg != null) {
                Text(
                    text = errorMsg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelSmall,
                    modifier =
                        Modifier
                            .align(
                                Alignment.TopCenter,
                            ).padding(4.dp)
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp)),
                )
            }
            MediaActionCard(
                imageUrl = matchedProduct?.imageUrl ?: "",
                title = item.detectedName,
                subtitle = "\${item.brandGuess} · \${item.category}",
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(8.dp)
                        .widthIn(max = 240.dp),
                trackingId = "vision_product_\${item.detectedName.replace(' ', '_')}",
                trackingAction = "view",
                actionRow = {
                    matchedProduct?.rating?.takeIf { it > 0.0 }?.let { rating ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.tertiary,
                                modifier = Modifier.size(16.dp),
                            )
                            Text(rating.toString().take(3), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    if (matchedProduct != null) {
                        val product = matchedProduct
                        SpressoButton(
                            text = "Style",
                            icon = Icons.Default.Style,
                            variant = SpressoButtonVariant.SECONDARY,
                            onClick = { onSelectProduct(matchedProduct.id) },
                            trackingId = "btn_style_${matchedProduct.id}",
                            trackingAction = "click_style",
                        )
                    }
                    if (matchedProduct != null) {
                        val product = matchedProduct
                        product.price?.takeIf { it > 0.0 }?.let { verifiedPrice ->
                            SpressoButton(
                                text = "$${verifiedPrice.toString().take(5)}",
                                icon = Icons.Default.ShoppingBag,
                                variant = SpressoButtonVariant.PRIMARY,
                                onClick = {
                                    scope.launch {
                                        try {
                                            val productId = product.id
                                            val merchantUrl = product.merchantUrl?.takeIf { it.startsWith("https://") }
                                            if (merchantUrl == null) {
                                                apiError = "A verified merchant listing is required before checkout."
                                                return@launch
                                            }
                                            onHitlCheckout(
                                                HITLPayload(
                                                    authorizationId =
                                                        "authorization-$productId-${kotlinx.datetime.Clock.System.now().toEpochMilliseconds()}",
                                                    product =
                                                        HITLProduct(
                                                            id = productId,
                                                            name = product.name,
                                                            price = verifiedPrice,
                                                            sku = "",
                                                            image = product.imageUrl,
                                                            merchantUrl = merchantUrl,
                                                        ),
                                                    quantity = 1,
                                                    totalAmount = verifiedPrice,
                                                    deviceSource = "ANDROID_APP",
                                                    availabilityStatus = "VERIFY_AT_MERCHANT_CHECKOUT",
                                                    humanInTheLoopChallenge =
                                                        HITLChallenge(
                                                            title = "Confirm purchase",
                                                            message = "Review this order, choose payment, and confirm with your device.",
                                                        ),
                                                ),
                                            )
                                        } catch (e: Exception) {
                                            apiError = "Unable to prepare checkout. Please try again."
                                        }
                                    }
                                },
                                trackingId = "btn_buy_${matchedProduct.id}",
                                trackingAction = "click_buy",
                            )
                        }
                    }
                },
            )
        }
    }
}
