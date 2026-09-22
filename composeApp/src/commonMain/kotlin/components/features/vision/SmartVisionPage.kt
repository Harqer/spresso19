package components.features.vision

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import components.features.chat.AIShopperInputBar
import components.models.*
import components.shared.MerchantHandoffDialog
import kotlinx.coroutines.launch
import network.ConvexApi
import network.DetectedItem
import network.ProductItem
import network.models.HITLPayload
import ui.rememberImagePicker

@Composable
fun SmartVisionPage(
    apiClient: ConvexApi,
    onSelectProduct: (String) -> Unit,
    onAskAI: (String) -> Unit = {},
    onTriggerGlobalLens: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var detectedItems by remember { mutableStateOf<List<DetectedItem>>(emptyList()) }
    var isScanning by remember { mutableStateOf(false) }
    var hitlCheckoutPayload by remember { mutableStateOf<HITLPayload?>(null) }
    var inventory by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
    var activeImage by remember { mutableStateOf<ByteArray?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val convexApi = remember { network.ConvexApi() }

    LaunchedEffect(Unit) {
        try {
            inventory = network.ConvexApi().fetchRecommendedProducts()
        } catch (e: Exception) {
            scope.launch { snackbarHostState.showSnackbar("Product availability could not be loaded. Please try again.") }
        }
    }

    val pickLensImage =
        rememberImagePicker(
            onFrameCaptured = null,
            onImagePicked = { bytes ->
                if (bytes != null) {
                    activeImage = bytes
                    isScanning = true

                    scope.launch {
                        try {
                            val uploaded = convexApi.uploadMedia(bytes, network.inferImageMimeType(bytes))
                            val response = convexApi.searchVision(uploaded.mediaKey)
                            if (response.success) {
                                // Lens results are canonical merchant listings. Keep the
                                // legacy overlay shape only as a presentation adapter; the
                                // listing remains the sole source of merchant/price data.
                                val lensProducts =
                                    response.listings.map { listing ->
                                        ProductItem(
                                            id = listing.id,
                                            name = listing.name,
                                            brand = listing.brand.orEmpty(),
                                            category = listing.category.orEmpty(),
                                            price = listing.observedPrice?.amount,
                                            imageUrl = listing.imageUrl.orEmpty(),
                                            merchantUrl = listing.merchantUrl,
                                            source = listing.source,
                                            providerListingId = listing.providerListingId,
                                        )
                                    }
                                inventory = (inventory + lensProducts).distinctBy { it.id }
                                detectedItems =
                                    response.listings.map { listing ->
                                        DetectedItem(
                                            detectedName = listing.name,
                                            brandGuess = listing.brand.orEmpty(),
                                            category = listing.category.orEmpty(),
                                            priceEstimate = listing.observedPrice?.amount ?: 0.0,
                                            confidenceScore = listing.confidence ?: 0.0,
                                            matchingCatalogId = listing.id,
                                        )
                                    }
                            } else {
                                detectedItems = emptyList()
                                snackbarHostState.showSnackbar("Visual search is unavailable right now.")
                            }
                        } catch (e: Exception) {
                            detectedItems = emptyList()
                            snackbarHostState.showSnackbar("Visual search could not be completed. Please try again.")
                        } finally {
                            isScanning = false
                        }
                    }
                }
            },
        )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
    ) { innerPadding ->
        Box(
            modifier =
                Modifier.fillMaxSize().padding(innerPadding).consumeWindowInsets(innerPadding).semantics(mergeDescendants = true) {
                    contentDescription = "Smart Vision and Virtual Try-On page"
                },
        ) {
            // Viewport
            SmartVisionViewport(
                activeImage = activeImage,
                isScanning = isScanning,
                detectedItems = detectedItems,
                inventory = inventory,
                apiClient = apiClient,
                onSelectProduct = onSelectProduct,
                onHitlCheckout = { hitlCheckoutPayload = it },
            )

            // Floating Controls Overlay
            SmartVisionControlsOverlay(
                onTriggerGlobalLens = onTriggerGlobalLens,
                onPickImage = { pickLensImage() },
                modifier = Modifier.align(Alignment.TopCenter),
            )

            // Bottom Input Bar
            Box(
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(start = 16.dp, end = 16.dp),
            ) {
                AIShopperInputBar(
                    onSend = onAskAI,
                    placeholder = "Ask Spresso about these items...",
                )
            }

            hitlCheckoutPayload?.let { payload ->
                MerchantHandoffDialog(
                    payload = payload,
                    onDismiss = { hitlCheckoutPayload = null },
                )
            }
        }
    }
}
