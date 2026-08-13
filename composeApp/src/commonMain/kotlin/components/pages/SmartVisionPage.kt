package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import components.molecules.LensDetectedItemCard
import components.molecules.SmartVisionHeader
import components.molecules.TryOnAnalysisCard
import components.organisms.HITLCheckoutModal
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.coroutines.launch
import network.ApiClient
import network.DetectedItem
import network.models.HITLPayload
import network.models.toHITLPayload
import ui.rememberImagePicker

@OptIn(ExperimentalEncodingApi::class)
@Composable
fun SmartVisionPage(
    apiClient: ApiClient,
    onSelectProduct: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var detectedItems by remember { mutableStateOf<List<DetectedItem>>(emptyList()) }
    var hudText by remember { mutableStateOf("Point camera or upload image for visual product search or Virtual Try-On.") }
    var tryOnAnalysisResult by remember { mutableStateOf<String?>(null) }
    var isScanning by remember { mutableStateOf(false) }
    var hitlCheckoutPayload by remember { mutableStateOf<HITLPayload?>(null) }
    val scope = rememberCoroutineScope()

    val pickLensImage = rememberImagePicker { bytes ->
        if (bytes != null) {
            isScanning = true
            tryOnAnalysisResult = null
            hudText = "Performing visual Lens search..."
            scope.launch {
                val base64Image = Base64.Default.encode(bytes)
                val response = apiClient.performLensSearch(base64Image)
                if (response.success) {
                    val result = response.detectedResult
                    val items = result?.detectedItems ?: emptyList()
                    detectedItems = items
                    hudText = result?.hudAnnotationText ?: if (items.isNotEmpty()) "Found ${items.size} detected product(s)." else "No products detected."
                } else {
                    hudText = "Visual search unavailable. Please check network connection."
                    detectedItems = emptyList()
                }
                isScanning = false
            }
        }
    }

    val pickTryOnImage = rememberImagePicker { bytes ->
        if (bytes != null) {
            isScanning = true
            hudText = "Processing Virtual Try-On..."
            scope.launch {
                val base64Image = Base64.Default.encode(bytes)
                try {
                    val result = apiClient.requestVirtualTryOn(base64Image)
                    tryOnAnalysisResult = result
                    hudText = "Virtual Try-On analysis complete."
                } catch (e: Exception) {
                    tryOnAnalysisResult = null
                    hudText = "Virtual Try-On failed: ${e.message ?: "Analysis error"}"
                } finally { isScanning = false }
            }
        }
    }

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp).semantics(mergeDescendants = true) {
            contentDescription = "Smart Vision and Virtual Try-On page"
        },
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SmartVisionHeader(hudText = hudText, onPickLensImage = { pickLensImage() }, onPickTryOnImage = { pickTryOnImage() })

        tryOnAnalysisResult?.let { resultText -> TryOnAnalysisCard(resultText = resultText) }

        if (isScanning) {
            Box(
                modifier = Modifier.fillMaxWidth().weight(1f).semantics(mergeDescendants = true) {
                    contentDescription = "Scanning image for visual detection"
                },
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f).semantics(mergeDescendants = true) {
                    contentDescription = "Detected object grid containing ${detectedItems.size} items"
                }
            ) {
                items(detectedItems) { item ->
                    LensDetectedItemCard(
                        item = item,
                        onSelectProduct = onSelectProduct,
                        onTapBuy = { selectedItem -> hitlCheckoutPayload = selectedItem.toHITLPayload() }
                    )
                }
            }
        }

        hitlCheckoutPayload?.let { payload ->
            HITLCheckoutModal(
                payload = payload,
                onDismiss = { hitlCheckoutPayload = null },
                onConfirmPurchase = { _ ->
                    scope.launch {
                        try {
                            val res = apiClient.confirmCheckoutWithToken(payload.product.id, payload.quantity, payload.authorizationId, "123 Main St")
                            hudText = res.message ?: "1-Tap Order confirmed successfully!"
                        } catch (e: Exception) {
                            hudText = "Checkout error: ${e.message}"
                        } finally { hitlCheckoutPayload = null }
                    }
                }
            )
        }
    }
}
