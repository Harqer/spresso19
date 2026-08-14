package components.features.vision

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import components.core.makeImageBitmap
import components.core.NetworkImage
import components.features.chat.AIShopperInputBar
import components.shared.HITLCheckoutModal
import components.features.vision.SmartVisionControlsOverlay
import components.features.vision.SmartVisionDetectionOverlay
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.coroutines.launch
import network.ApiClient
import network.DetectedItem
import network.ProductItem
import network.models.HITLChallenge
import network.models.HITLPayload
import network.models.HITLProduct
import ui.rememberImagePicker

@OptIn(ExperimentalEncodingApi::class)
@Composable
fun SmartVisionPage(
    apiClient: ApiClient,
    onSelectProduct: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var detectedItems by remember { mutableStateOf<List<DetectedItem>>(emptyList()) }
    var isScanning by remember { mutableStateOf(false) }
    var hitlCheckoutPayload by remember { mutableStateOf<HITLPayload?>(null) }
    var inventory by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
    var activeImage by remember { mutableStateOf<ByteArray?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        try {
            inventory = apiClient.getInventory()
        } catch (e: Exception) {
            scope.launch { snackbarHostState.showSnackbar("Failed to load inventory: ${e.message}") }
        }
    }

    val pickLensImage = rememberImagePicker { bytes ->
        if (bytes != null) {
            activeImage = bytes
            isScanning = true
            scope.launch {
                val base64Image = Base64.Default.encode(bytes)
                val response = apiClient.performLensSearch(base64Image)
                if (response.success) {
                    val items = response.detectedResult?.detectedItems ?: emptyList()
                    detectedItems = items
                } else {
                    detectedItems = emptyList()
                    snackbarHostState.showSnackbar("Vision Search unavailable")
                }
                isScanning = false
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize().imePadding(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding).semantics(mergeDescendants = true) {
                contentDescription = "Smart Vision and Virtual Try-On page"
            }) {
        // Viewport
        if (activeImage != null) {
            val activeImageBitmap = activeImage?.makeImageBitmap()
            if (activeImageBitmap != null) {
                androidx.compose.foundation.Image(
                    bitmap = activeImageBitmap,
                    contentDescription = "Camera Stream",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .then(if (isScanning) Modifier.blur(1.dp) else Modifier)
                )
            }
            if (isScanning) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.6f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(48.dp))
                        Text(
                            "Scanning frame...",
                            color = MaterialTheme.colorScheme.onSurface,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.padding(top = 12.dp)
                        )
                    }
                }
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
                            onHitlCheckout = { hitlCheckoutPayload = it }
                        )
                    }
                }
            }
        }
        
        // Floating Controls Overlay
        SmartVisionControlsOverlay(
            onPickLensImage = { pickLensImage() },
            modifier = Modifier.align(Alignment.TopCenter)
        )
        
        // Bottom Input Bar
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 16.dp, end = 16.dp)
        ) {
            AIShopperInputBar(
                onSend = { /* Implement onAskAI */ },
                placeholder = "Ask AI about object detection & vision search..."
            )
        }
        
        hitlCheckoutPayload?.let { payload ->
            HITLCheckoutModal(
                payload = payload,
                onDismiss = { hitlCheckoutPayload = null },
                onConfirmPurchase = { _ ->
                    scope.launch {
                        try {
                            apiClient.confirmCheckoutWithToken(payload.product.id, payload.quantity, payload.authorizationId, "123 Main St")
                        val res = apiClient.confirmCheckoutWithToken(payload.product.id, payload.quantity, payload.authorizationId, "123 Main St")
                            snackbarHostState.showSnackbar(res.message ?: "Order confirmed")
                        } catch (e: Exception) {
                            snackbarHostState.showSnackbar("Checkout failed: ${e.message}")
                        } finally { hitlCheckoutPayload = null }
                    }
                }
            )
        }
    }
    }
}
