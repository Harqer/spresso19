package components.pages

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import components.molecules.AIShopperInputBar
import components.molecules.ProductCard
import components.organisms.*
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
        scope.launch {
            try { products = apiClient.getInventory(); isLoading = false }
            catch (e: Exception) { errorMessage = "Failed to load products: ${e.message}"; isLoading = false }
        }
    }

    ProductCatalogScreen(
        products = products, isLoading = isLoading, errorMessage = errorMessage,
        httpClient = httpClient, onProductSelected = onProductSelected,
        onTryOnRequested = onTryOnRequested, userLocation = userLocation, searchRadius = searchRadius,
        onRequestLocationPermission = onRequestLocationPermission, onShareRequested = onShareRequested,
        onAskAI = onAskAI, apiClient = apiClient, modifier = modifier
    )
}

@Composable
fun ProductCatalogScreen(
    products: List<ProductItem>, isLoading: Boolean, errorMessage: String?, httpClient: HttpClient,
    onProductSelected: (String) -> Unit, onTryOnRequested: (ProductItem) -> Unit, apiClient: ApiClient,
    userLocation: String? = null, searchRadius: Int = 25, onRequestLocationPermission: () -> Unit = {},
    onShareRequested: (String) -> Unit = {}, onAskAI: (String) -> Unit = {}, modifier: Modifier = Modifier
) {
    var selectedCategoryId by remember { mutableStateOf("ALL") }
    var activeDetailProduct by remember { mutableStateOf<ProductItem?>(null) }
    var checkoutStatus by remember { mutableStateOf<String?>(null) }
    var hitlCheckoutPayload by remember { mutableStateOf<HITLPayload?>(null) }
    val scope = rememberCoroutineScope()
    val curatedProducts = remember(products) { products.take(3) }

    val filteredProducts = remember(products, selectedCategoryId) {
        if (selectedCategoryId.equals("ALL", ignoreCase = true)) products
        else products.filter { p -> p.category.contains(selectedCategoryId, ignoreCase = true) }
    }

    Box(modifier = modifier.fillMaxSize().background(Color(0xFFF8FAF8))) {
        if (isLoading) CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        else if (errorMessage != null) Text(errorMessage, color = MaterialTheme.colorScheme.error, modifier = Modifier.align(Alignment.Center))
        else {
            LazyVerticalGrid(columns = GridCells.Fixed(2), contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxSize()) {
                item(span = { GridItemSpan(2) }) { ProductCatalogHeader(selectedCategoryId = selectedCategoryId, onCategorySelected = { selectedCategoryId = it }, userLocation = userLocation, searchRadius = searchRadius, onRequestLocationPermission = onRequestLocationPermission) }
                if (selectedCategoryId == "ALL" && curatedProducts.isNotEmpty()) {
                    item(span = { GridItemSpan(2) }) { AICurationFeed(curatedProducts = curatedProducts, httpClient = httpClient, onTryOnRequested = onTryOnRequested) }
                }
                items(filteredProducts) { product -> ProductCard(product = product, client = httpClient, onProductClick = { activeDetailProduct = product; onProductSelected(product.id) }, onTryOnClick = { onTryOnRequested(product) }, onAddToCartClick = { hitlCheckoutPayload = product.toHITLPayload() }) }
                item(span = { GridItemSpan(2) }) { AIShopperInputBar(onSend = onAskAI, placeholder = "Ask Spresso AI...", modifier = Modifier.padding(top = 16.dp)) }
            }
        }

        if (activeDetailProduct != null) {
            val prod = activeDetailProduct!!
            ProductCatalogDetailDialog(
                product = prod, checkoutStatus = checkoutStatus, onDismiss = { activeDetailProduct = null }, onTryOn = { activeDetailProduct = null; onTryOnRequested(it) },
                onSpin360 = { id -> scope.launch { try { apiClient.requestSpin360(id); checkoutStatus = "Spin 360 generated!" } catch (e: Exception) { checkoutStatus = "Spin 360 note: ${e.message}" } } },
                onLike = { checkoutStatus = "Saved to favorites!" }, onShare = { onShareRequested(it) }, onBuyNow = { activeDetailProduct = null; hitlCheckoutPayload = prod.toHITLPayload() }
            )
        }

        if (hitlCheckoutPayload != null) {
            val payload = hitlCheckoutPayload!!
            HITLCheckoutModal(
                payload = payload, onDismiss = { hitlCheckoutPayload = null },
                onConfirmPurchase = { _ -> scope.launch { try { checkoutStatus = apiClient.confirmCheckoutWithToken(payload.product.id, payload.quantity, payload.authorizationId, "123 Main St").message ?: "Order confirmed!" } catch (e: Exception) { checkoutStatus = "Checkout note: ${e.message}" } finally { hitlCheckoutPayload = null } } }
            )
        }
    }
}

private fun ProductItem.toHITLPayload(quantity: Int = 1): HITLPayload {
    return HITLPayload(authorizationId = "AUTH-${id.uppercase()}", product = HITLProduct(id = id, name = name, price = price, sku = "SKU-${id.uppercase()}", image = imageUrl), quantity = quantity, totalAmount = price * quantity, currency = "USD", deviceSource = "WEARABLE", inventoryConfirmed = true, stockRemaining = 10, humanInTheLoopChallenge = HITLChallenge(title = "Biometric Verification Required", message = "Confirm purchase with fingerprint or passkey"))
}



