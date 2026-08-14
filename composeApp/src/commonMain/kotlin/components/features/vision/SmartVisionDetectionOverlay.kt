package components.features.vision

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import network.ApiClient
import network.DetectedItem
import network.ProductItem
import network.models.HITLChallenge
import network.models.HITLPayload
import network.models.HITLProduct
import components.core.NetworkImage
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant
import components.molecules.MediaActionCard

@Composable
fun SmartVisionDetectionOverlay(
    item: DetectedItem,
    matchedProduct: ProductItem?,
    width: Dp,
    height: Dp,
    apiClient: ApiClient,
    onSelectProduct: (String) -> Unit,
    onHitlCheckout: (HITLPayload) -> Unit
) {
    val box = item.boundingBox ?: listOf(250.0, 250.0, 750.0, 750.0)
    val yMin = (box.getOrNull(0) ?: 0.0) / 1000f
    val xMin = (box.getOrNull(1) ?: 0.0) / 1000f
    val yMax = (box.getOrNull(2) ?: 0.0) / 1000f
    val xMax = (box.getOrNull(3) ?: 0.0) / 1000f
    
    val boxTop = height * yMin.toFloat()
    val boxLeft = width * xMin.toFloat()
    val boxWidth = width * (xMax.toFloat() - xMin.toFloat())
    val boxHeight = height * (yMax.toFloat() - yMin.toFloat())
    
    Box(
        modifier = Modifier
            .absoluteOffset(x = boxLeft, y = boxTop) // The absoluteOffset must be handled by caller if it's in BoxWithConstraints, but we'll use simple Box
            .size(width = boxWidth, height = boxHeight)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
        ) {
            if (matchedProduct != null && (matchedProduct.rating ?: 0.0) > 0.0) {
                Row(
                    modifier = Modifier
                        .offset(x = (-4).dp, y = (-12).dp)
                        .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.Star, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(12.dp))
                    Text(
                        text = "%.1f".format(matchedProduct.rating),
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold)
                    )
                }
            }
            
            MediaActionCard(
                imageUrl = matchedProduct?.imageUrl ?: "",
                title = item.detectedName,
                subtitle = "${item.brandGuess} · ${item.category}".uppercase(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(8.dp),
                trackingId = "vision_product_${item.detectedName.replace(" ", "_")}",
                trackingAction = "view",
                badgeContent = {
                    if (matchedProduct != null && (matchedProduct.rating ?: 0.0) > 0.0) {
                        Row(
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(6.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.Star, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(12.dp))
                            Text(
                                text = matchedProduct.rating.toString().take(3),
                                color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold)
                            )
                        }
                    }
                },
                actionRow = {
                    if (matchedProduct != null) {
                        SpressoButton(
                            text = "Style",
                            icon = Icons.Default.Style,
                            variant = SpressoButtonVariant.SECONDARY,
                            onClick = { onSelectProduct(matchedProduct.id) },
                            trackingId = "btn_style_${matchedProduct.id}",
                            trackingAction = "click_style"
                        )
                    }
                    val price = if (item.priceEstimate > 0) item.priceEstimate else (matchedProduct?.price ?: 0.0)
                    SpressoButton(
                        text = "$${price.toString().take(5)}",
                        icon = Icons.Default.ShoppingBag,
                        variant = SpressoButtonVariant.PRIMARY,
                        onClick = {
                            val payload = HITLPayload(
                                authorizationId = "ORDER-1234567890",
                                product = HITLProduct(
                                    id = matchedProduct?.id ?: "prod-detected",
                                    name = item.detectedName,
                                    price = price,
                                    sku = "VIS-SKU",
                                    image = matchedProduct?.imageUrl ?: ""
                                ),
                                quantity = 1,
                                totalAmount = price,
                                currency = "USD",
                                deviceSource = "MOBILE_ANDROID",
                                inventoryConfirmed = true,
                                stockRemaining = 10,
                                humanInTheLoopChallenge = HITLChallenge(
                                    title = "Confirm Purchase",
                                    message = "Confirm purchase of ${item.detectedName} for $${price}?",
                                    safetyChecks = listOf("In stock and reserved", "Includes free express delivery", "Click confirm to place order")
                                )
                            )
                            onHitlCheckout(payload)
                        },
                        trackingId = "btn_buy_${matchedProduct?.id ?: "detected"}",
                        trackingAction = "click_buy"
                    )
                }
            )
        }
    }
}
