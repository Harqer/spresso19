package components.features.vision

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import components.core.makeImageBitmap
import network.ApiClient
import network.DetectedItem
import network.ProductItem
import network.models.HITLPayload

@Composable
fun SmartVisionViewport(
    activeImage: ByteArray?,
    isScanning: Boolean,
    detectedItems: List<DetectedItem>,
    inventory: List<ProductItem>,
    apiClient: ApiClient,
    onSelectProduct: (String) -> Unit,
    onHitlCheckout: (HITLPayload) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (activeImage == null) return

    val activeImageBitmap = remember(activeImage) { activeImage.makeImageBitmap() }
    if (activeImageBitmap != null) {
        Image(
            bitmap = activeImageBitmap,
            contentDescription = "Camera Stream",
            contentScale = ContentScale.Crop,
            modifier =
                modifier
                    .fillMaxSize()
                    .then(if (isScanning) Modifier.blur(1.dp) else Modifier),
        )
    }

    if (isScanning) {
        SmartVisionScanningOverlay()
    } else {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val width = maxWidth
            val height = maxHeight
            detectedItems.forEach { item ->
                val matchedProduct = inventory.find { it.id == item.matchingCatalogId }
                SmartVisionDetectionOverlay(
                    item = item,
                    matchedProduct = matchedProduct,
                    width = width,
                    height = height,
                    apiClient = apiClient,
                    onSelectProduct = onSelectProduct,
                    onHitlCheckout = onHitlCheckout,
                )
            }
        }
    }
}
