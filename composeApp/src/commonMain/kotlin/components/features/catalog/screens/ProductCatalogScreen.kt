package components.features.catalog.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.dp
import components.features.catalog.AICurationFeed
import components.features.catalog.ProductCatalogDetailDialog
import components.features.catalog.ProductCatalogHeader
import components.features.chat.AIShopperInputBar
import components.models.*
import components.shared.MerchantHandoffDialog
import components.shared.ProblemDetailsCard
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.shared.widgets.MediaActionCard
import io.ktor.client.HttpClient
import kotlinx.coroutines.launch
import network.ApiClient
import network.ProductItem
import network.models.*

@Composable
fun ProductCatalogScreen(
    products: List<ProductItem>,
    isLoading: Boolean,
    errorMessage: String?,
    httpClient: HttpClient,
    onProductSelected: (String) -> Unit,
    onTryOnRequested: (ProductItem) -> Unit,
    onMediaGenerated: (String, String) -> Unit,
    apiClient: ApiClient,
    userLocation: String? = null,
    searchRadius: Int = 25,
    onRequestLocationPermission: () -> Unit = {},
    onShareRequested: (String) -> Unit = {},
    onAskAI: (String) -> Unit = {},
    onCheckoutRequested: () -> Unit = {},
    onRetry: () -> Unit = {},
    catalogViewModel: viewmodels.CatalogViewModel,
    modifier: Modifier = Modifier,
) {
    var selectedCategoryId by remember { mutableStateOf("ALL") }

    val activeDetailProduct by catalogViewModel.activeDetailProduct.collectAsState()
    val checkoutStatus by catalogViewModel.checkoutStatus.collectAsState()
    val hitlCheckoutPayload by catalogViewModel.hitlCheckoutPayload.collectAsState()

    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(checkoutStatus) {
        checkoutStatus?.let {
            snackbarHostState.showSnackbar(it)
            catalogViewModel.clearCheckoutStatus()
        }
    }

    val filteredProducts =
        remember(products, selectedCategoryId) {
            if (selectedCategoryId.equals("ALL", ignoreCase = true)) {
                products
            } else {
                products.filter { p -> p.category.contains(selectedCategoryId, ignoreCase = true) }
            }
        }

    val layoutDirection = LocalLayoutDirection.current
    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            if (isLoading && products.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (products.isEmpty() && errorMessage == null) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "No products available",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "We couldn't find any products in this category. Check back later!",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding =
                        PaddingValues(
                            start = 16.dp + innerPadding.calculateStartPadding(layoutDirection),
                            top = 16.dp + innerPadding.calculateTopPadding(),
                            end = 16.dp + innerPadding.calculateEndPadding(layoutDirection),
                            bottom = 16.dp + innerPadding.calculateBottomPadding(),
                        ),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize().consumeWindowInsets(innerPadding),
                ) {
                    item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
                        ProductCatalogHeader(selectedCategoryId = selectedCategoryId, onCategorySelected = {
                            selectedCategoryId =
                                it
                        }, userLocation = userLocation, searchRadius = searchRadius, onRequestLocationPermission = onRequestLocationPermission)
                    }

                    if (errorMessage != null) {
                        item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
                            ProblemDetailsCard(
                                title = "Catalog Connection Unavailable",
                                statusCode = 503,
                                detail = errorMessage,
                                onRetry = onRetry,
                                modifier = Modifier.padding(bottom = 16.dp),
                            )
                        }
                    }

                    if (selectedCategoryId == "ALL" && products.isNotEmpty()) {
                        item(span = {
                            GridItemSpan(this.maxCurrentLineSpan)
                        }) {
                            AICurationFeed(
                                curatedProducts = products.take(3),
                                httpClient = httpClient,
                                onTryOnRequested = onTryOnRequested,
                            )
                        }
                    }
                    items(filteredProducts) { product ->
                        MediaActionCard(
                            imageUrl = product.imageUrl,
                            title = product.name,
                            subtitle = "${product.brand} • $${product.price}",
                            onClick = {
                                catalogViewModel.setActiveDetailProduct(product)
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
                                    modifier = Modifier.weight(1f),
                                )
                                SpressoButton(
                                    text = "Buy",
                                    onClick = {
                                        catalogViewModel.initiateCheckout(product)
                                    },
                                    variant = SpressoButtonVariant.PRIMARY,
                                    trackingId = "catalog_buy_${product.id}",
                                    trackingAction = "click_buy_now",
                                    modifier = Modifier.weight(1f),
                                )
                            },
                        )
                    }
                    item(span = {
                        GridItemSpan(this.maxCurrentLineSpan)
                    }) {
                        AIShopperInputBar(
                            onSend = onAskAI,
                            placeholder = "Ask Spresso about products...",
                            modifier = Modifier.padding(top = 16.dp),
                        )
                    }
                }
            }

            activeDetailProduct?.let { prod ->
                ProductCatalogDetailDialog(
                    product = prod,
                    checkoutStatus = checkoutStatus,
                    onDismiss = {
                        scope.launch {
                            runCatching { apiClient.recordInteraction(prod.id, "viewed_product_details") }
                        }
                        catalogViewModel.setActiveDetailProduct(null)
                    },
                    onTryOn = {
                        catalogViewModel.setActiveDetailProduct(null)
                        onTryOnRequested(it)
                    },
                    onSpin360 = { id ->
                        scope.launch {
                            try {
                                val mediaUrl = apiClient.requestSpin360(id)
                                onMediaGenerated(mediaUrl, "video")
                            } catch (
                                e: Exception,
                            ) {
                                catalogViewModel.setCheckoutStatus("Spin 360 note: ${e.message}")
                            }
                        }
                    },
                    onLike = {
                        scope.launch {
                            try {
                                apiClient.recordInteraction(prod.id, "like")
                                catalogViewModel.setCheckoutStatus("Saved to favorites.")
                            } catch (e: Exception) {
                                catalogViewModel.setCheckoutStatus("Unable to save this product. Please try again.")
                            }
                        }
                    },
                    onShare = {
                        scope.launch {
                            runCatching { apiClient.recordInteraction(prod.id, "share") }
                        }
                        onShareRequested(it)
                    },
                    onBuyNow = {
                        catalogViewModel.setActiveDetailProduct(null)
                        catalogViewModel.initiateCheckout(prod)
                        onCheckoutRequested()
                    },
                )
            }

            hitlCheckoutPayload?.let { payload ->
                MerchantHandoffDialog(
                    payload = payload,
                    onDismiss = { catalogViewModel.dismissCheckout() },
                )
            }
        }
    }
}
