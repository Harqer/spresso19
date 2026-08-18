package components.features.vision

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import components.core.makeImageBitmap
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
import network.models.HITLPayload
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
            inventory = apiClient.discoverPersonalizedProducts()
        } catch (e: Exception) {
            scope.launch { snackbarHostState.showSnackbar("Failed to load inventory: ${e.message}") }
        }
    }

    val pickLensImage = rememberImagePicker(
        onFrameCaptured = null,
        onImagePicked = { bytes ->
            if (bytes != null) {
                activeImage = bytes
                isScanning = true
                
                scope.launch {
                    @OptIn(ExperimentalEncodingApi::class)
                    val base64Image = Base64.Default.encode(bytes)
                    try {
                        val response = apiClient.performLensSearch(base64Image)
                        if (response.success) {
                            detectedItems = response.detectedResult?.detectedItems ?: emptyList()
                        } else {
                            detectedItems = emptyList()
                            snackbarHostState.showSnackbar("Vision Search unavailable")
                        }
                    } catch (e: Exception) {
                        detectedItems = emptyList()
                        snackbarHostState.showSnackbar("Search failed: ${e.message}")
                    } finally {
                        isScanning = false
                    }
                }
            }
        }
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding).consumeWindowInsets(innerPadding).semantics(mergeDescendants = true) {
                contentDescription = "Smart Vision and Virtual Try-On page"
            }) {
        // Viewport
        SmartVisionViewport(
            activeImage = activeImage,
            isScanning = isScanning,
            detectedItems = detectedItems,
            inventory = inventory,
            apiClient = apiClient,
            onSelectProduct = onSelectProduct,
            onHitlCheckout = { hitlCheckoutPayload = it }
        )
        
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
                onSend = { 
                    scope.launch {
                        try {
                            network.SpressoBackend.logVisionEvent(detectedObjects = it, context = "chat", imageUrl = null)
                        } catch(e: Exception) {
                            snackbarHostState.showSnackbar("Error: ${e.message}")
                        }
                    }
                },
                placeholder = "Ask Spresso AI about these items..."
            )
        }
        
        hitlCheckoutPayload?.let { payload ->
            HITLCheckoutModal(
                payload = payload,
                onDismiss = { hitlCheckoutPayload = null },
                onConfirmPurchase = { _ ->
                    scope.launch {
                        try {
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
