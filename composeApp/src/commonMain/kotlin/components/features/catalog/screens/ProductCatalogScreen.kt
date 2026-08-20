package components.features.catalog.screens

import components.models.*

import components.shared.ProblemDetailsCard
import components.shared.HITLCheckoutModal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.dp
import components.features.catalog.ProductCatalogHeader
import components.features.catalog.AICurationFeed
import components.features.catalog.ProductCatalogDetailDialog
import components.features.chat.AIShopperInputBar
import components.shared.widgets.MediaActionCard
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import io.ktor.client.HttpClient
import kotlinx.coroutines.launch
import network.ApiClient
import network.ProductItem
import network.VideoInteractionEvent
import network.getCurrentUserUid
import network.models.*
import kotlinx.datetime.Clock

@Composable
fun ProductCatalogScreen(
    products: List<ProductItem>, isLoading: Boolean, errorMessage: String?, httpClient: HttpClient,
    onProductSelected: (String) -> Unit, onTryOnRequested: (ProductItem) -> Unit, apiClient: ApiClient,
    userLocation: String? = null, searchRadius: Int = 25, onRequestLocationPermission: () -> Unit = {},
    onShareRequested: (String) -> Unit = {}, onAskAI: (String) -> Unit = {}, onRetry: () -> Unit = {}, 
    catalogViewModel: viewmodels.CatalogViewModel, modifier: Modifier = Modifier
) {
    var selectedCategoryId by remember { mutableStateOf("ALL") }
    
    val activeDetailProduct by catalogViewModel.activeDetailProduct.collectAsState()
    val checkoutStatus by catalogViewModel.checkoutStatus.collectAsState()
    val hitlCheckoutPayload by catalogViewModel.hitlCheckoutPayload.collectAsState()

    var viewStartTime by remember { mutableStateOf(0L) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val activeUid = getCurrentUserUid() ?: "anonymous_user"

    LaunchedEffect(checkoutStatus) {
        checkoutStatus?.let {
            snackbarHostState.showSnackbar(it)
            catalogViewModel.clearCheckoutStatus()
        }
    }

    val filteredProducts = remember(products, selectedCategoryId) {
        if (selectedCategoryId.equals("ALL", ignoreCase = true)) products
        else products.filter { p -> p.category.contains(selectedCategoryId, ignoreCase = true) }
    }

    val layoutDirection = LocalLayoutDirection.current
    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            if (isLoading && products.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (products.isEmpty() && errorMessage == null) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("No products available", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("We couldn't find any products in this category. Check back later!", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding = PaddingValues(
                        start = 16.dp + innerPadding.calculateStartPadding(layoutDirection),
                        top = 16.dp + innerPadding.calculateTopPadding(),
                        end = 16.dp + innerPadding.calculateEndPadding(layoutDirection),
                        bottom = 16.dp + innerPadding.calculateBottomPadding()
                    ),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize().consumeWindowInsets(innerPadding)
                ) {
                    item(span = { GridItemSpan(this.maxCurrentLineSpan) }) { ProductCatalogHeader(selectedCategoryId = selectedCategoryId, onCategorySelected = { selectedCategoryId = it }, userLocation = userLocation, searchRadius = searchRadius, onRequestLocationPermission = onRequestLocationPermission) }
                    
                    if (errorMessage != null) {
                        item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
                            ProblemDetailsCard(
                                title = "Catalog Connection Unavailable",
                                statusCode = 503,
                                detail = errorMessage,
                                onRetry = onRetry,
                                modifier = Modifier.padding(bottom = 16.dp)
                            )
                        }
                    }

                    if (selectedCategoryId == "ALL" && products.isNotEmpty()) {
                        item(span = { GridItemSpan(this.maxCurrentLineSpan) }) { AICurationFeed(curatedProducts = products.take(3), httpClient = httpClient, onTryOnRequested = onTryOnRequested) }
                    }
                    items(filteredProducts) { product ->
                        MediaActionCard(
                            imageUrl = product.imageUrl,
                            title = product.name,
                            subtitle = "${product.brand} • $${product.price}",
                            onClick = {
                                catalogViewModel.setActiveDetailProduct(product)
                                viewStartTime = Clock.System.now().toEpochMilliseconds()
                                onProductSelected(product.id)
                            },
                            trackingId = "catalog_product_${product.id}",
                            trackingAction = "click_product",
                            actionRow = {
                                SpressoButton(
                                    text = "Try On",
                                    onClick = { onTryOnRequested(product) },
                                    variant = SpressoButtonVariant.SECONDARY,
                                    trackingId = "catalog_tryon_${product.id}",
                                    trackingAction = "click_tryon",
                                    modifier = Modifier.weight(1f)
                                )
                                SpressoButton(
                                    text = "Buy",
                                    onClick = { 
                                        catalogViewModel.initiateCheckout(product)
                                    },
                                    variant = SpressoButtonVariant.PRIMARY,
                                    trackingId = "catalog_buy_${product.id}",
                                    trackingAction = "click_buy_now",
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        )
                    }
                    item(span = { GridItemSpan(this.maxCurrentLineSpan) }) { AIShopperInputBar(onSend = onAskAI, placeholder = "Ask Spresso about products...", modifier = Modifier.padding(top = 16.dp)) }
                }
            }

            activeDetailProduct?.let { prod ->
                ProductCatalogDetailDialog(
                    product = prod, checkoutStatus = checkoutStatus, 
                    onDismiss = { 
                        val duration = Clock.System.now().toEpochMilliseconds() - viewStartTime
                        scope.launch {
                            apiClient.streamTelemetry(
                                VideoInteractionEvent(
                                    uid = activeUid,
                                    itemId = prod.id,
                                    watchRatio = minOf(1.0, duration / 5000.0), // Simulate watch ratio (5s = 1.0)
                                    scrollVelocityMs = duration.toInt(),
                                    pauseCount = 0,
                                    likePressed = false,
                                    sharedExternal = false
                                )
                            )
                        }
                        catalogViewModel.setActiveDetailProduct(null) 
                    }, 
                    onTryOn = { catalogViewModel.setActiveDetailProduct(null); onTryOnRequested(it) },
                    onSpin360 = { id -> scope.launch { try { apiClient.requestSpin360(id); catalogViewModel.setCheckoutStatus("Spin 360 generated!") } catch (e: Exception) { catalogViewModel.setCheckoutStatus("Spin 360 note: ${e.message}") } } },
                    onLike = { 
                        scope.launch {
                            apiClient.streamTelemetry(
                                VideoInteractionEvent(
                                    uid = activeUid, itemId = prod.id,
                                    watchRatio = 1.0, scrollVelocityMs = 5000, pauseCount = 0, likePressed = true, sharedExternal = false
                                )
                            )
                        }
                        catalogViewModel.setCheckoutStatus("Saved to favorites!") 
                    }, 
                    onShare = { 
                        scope.launch {
                            apiClient.streamTelemetry(
                                VideoInteractionEvent(
                                    uid = activeUid, itemId = prod.id,
                                    watchRatio = 1.0, scrollVelocityMs = 5000, pauseCount = 0, likePressed = false, sharedExternal = true
                                )
                            )
                        }
                        onShareRequested(it) 
                    }, 
                    onBuyNow = { 
                        catalogViewModel.setActiveDetailProduct(null)
                        catalogViewModel.initiateCheckout(prod)
                    }
                )
            }

            hitlCheckoutPayload?.let { payload ->
                HITLCheckoutModal(
                    payload = payload, onDismiss = { catalogViewModel.dismissCheckout() },
                    onConfirmPurchase = { address -> catalogViewModel.confirmCheckout(address) }
                )
            }
        }
    }
}


