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
import network.models.*

@Composable
fun ProductCatalogScreen(
    products: List<ProductItem>, isLoading: Boolean, errorMessage: String?, httpClient: HttpClient,
    onProductSelected: (String) -> Unit, onTryOnRequested: (ProductItem) -> Unit, apiClient: ApiClient,
    userLocation: String? = null, searchRadius: Int = 25, onRequestLocationPermission: () -> Unit = {},
    onShareRequested: (String) -> Unit = {}, onAskAI: (String) -> Unit = {}, onRetry: () -> Unit = {}, modifier: Modifier = Modifier
) {
    var selectedCategoryId by remember { mutableStateOf("ALL") }
    var activeDetailProduct by remember { mutableStateOf<ProductItem?>(null) }
    var checkoutStatus by remember { mutableStateOf<String?>(null) }
    var hitlCheckoutPayload by remember { mutableStateOf<HITLPayload?>(null) }
    val scope = rememberCoroutineScope()
    val curatedProducts = remember(products) { products.take(3) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(checkoutStatus) {
        checkoutStatus?.let {
            snackbarHostState.showSnackbar(it)
            checkoutStatus = null
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

                    if (selectedCategoryId == "ALL" && curatedProducts.isNotEmpty()) {
                        item(span = { GridItemSpan(this.maxCurrentLineSpan) }) { AICurationFeed(curatedProducts = curatedProducts, httpClient = httpClient, onTryOnRequested = onTryOnRequested) }
                    }
                    items(filteredProducts) { product ->
                        MediaActionCard(
                            imageUrl = product.imageUrl,
                            title = product.name,
                            subtitle = "${product.brand} • $${product.price}",
                            onClick = {
                                activeDetailProduct = product
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
                                    onClick = { hitlCheckoutPayload = product.toHITLPayload() },
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
                    product = prod, checkoutStatus = checkoutStatus, onDismiss = { activeDetailProduct = null }, onTryOn = { activeDetailProduct = null; onTryOnRequested(it) },
                    onSpin360 = { id -> scope.launch { try { apiClient.requestSpin360(id); checkoutStatus = "Spin 360 generated!" } catch (e: Exception) { checkoutStatus = "Spin 360 note: ${e.message}" } } },
                    onLike = { checkoutStatus = "Saved to favorites!" }, onShare = { onShareRequested(it) }, onBuyNow = { activeDetailProduct = null; hitlCheckoutPayload = prod.toHITLPayload() }
                )
            }

            hitlCheckoutPayload?.let { payload ->
                HITLCheckoutModal(
                    payload = payload, onDismiss = { hitlCheckoutPayload = null },
                    onConfirmPurchase = { _ -> scope.launch { try { checkoutStatus = apiClient.confirmCheckoutWithToken(payload.product.id, payload.quantity, payload.authorizationId, "123 Main St").message ?: "Order confirmed!" } catch (e: Exception) { checkoutStatus = "Checkout note: ${e.message}" } finally { hitlCheckoutPayload = null } } }
                )
            }
        }
    }
}

private fun ProductItem.toHITLPayload(quantity: Int = 1): HITLPayload {
    val safePrice = price ?: 0.0
    return HITLPayload(authorizationId = "AUTH-${id.uppercase()}", product = HITLProduct(id = id, name = name, price = safePrice, sku = "SKU-${id.uppercase()}", image = imageUrl), quantity = quantity, totalAmount = safePrice * quantity, currency = "USD", deviceSource = "WEARABLE", inventoryConfirmed = true, stockRemaining = 10, humanInTheLoopChallenge = HITLChallenge(title = "Biometric Verification Required", message = "Confirm purchase with fingerprint or passkey"))
}
