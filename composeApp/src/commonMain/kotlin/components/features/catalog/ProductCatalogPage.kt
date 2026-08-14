package components.features.catalog

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
import androidx.compose.ui.unit.dp
import components.features.chat.AIShopperInputBar
import components.molecules.MediaActionCard
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant
import io.ktor.client.HttpClient
import kotlinx.coroutines.launch
import network.ApiClient
import network.ProductItem
import network.models.*

@Composable
fun ProductCatalogPage(
    apiClient: ApiClient, httpClient: HttpClient, onProductSelected: (String) -> Unit,
    onTryOnRequested: (ProductItem) -> Unit, userLocation: String? = null, searchRadius: Int = 25,
    onRequestLocationPermission: () -> Unit = {}, onShareRequested: (String) -> Unit = {},
    onAskAI: (String) -> Unit = {}, modifier: Modifier = Modifier
) {
    var products by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        isLoading = true
        try { products = apiClient.getInventory() }
        catch (e: Exception) { errorMessage = "Failed to load products: ${e.message}" }
        finally { isLoading = false }
    }

    val retry = {
        scope.launch {
            isLoading = true
            errorMessage = null
            try { products = apiClient.getInventory() }
            catch (e: Exception) { errorMessage = "Failed to load products: ${e.message}" }
            finally { isLoading = false }
        }
    }

    ProductCatalogScreen(
        products = products, isLoading = isLoading, errorMessage = errorMessage,
        httpClient = httpClient, onProductSelected = onProductSelected,
        onTryOnRequested = onTryOnRequested, userLocation = userLocation, searchRadius = searchRadius,
        onRequestLocationPermission = onRequestLocationPermission, onShareRequested = onShareRequested,
        onAskAI = onAskAI, apiClient = apiClient, onRetry = { retry() }, modifier = modifier
    )
}

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

    Scaffold(
        modifier = modifier.fillMaxSize().imePadding(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            if (isLoading && products.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                LazyVerticalGrid(columns = GridCells.Adaptive(minSize = 300.dp), contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxSize()) {
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
    return HITLPayload(authorizationId = "AUTH-${id.uppercase()}", product = HITLProduct(id = id, name = name, price = price, sku = "SKU-${id.uppercase()}", image = imageUrl), quantity = quantity, totalAmount = price * quantity, currency = "USD", deviceSource = "WEARABLE", inventoryConfirmed = true, stockRemaining = 10, humanInTheLoopChallenge = HITLChallenge(title = "Biometric Verification Required", message = "Confirm purchase with fingerprint or passkey"))
}
