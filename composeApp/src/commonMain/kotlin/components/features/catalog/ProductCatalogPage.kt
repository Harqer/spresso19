package components.features.catalog

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import components.features.catalog.screens.ProductCatalogScreen
import io.ktor.client.HttpClient
import kotlinx.coroutines.launch
import network.ApiClient
import network.ProductItem

@Composable
fun ProductCatalogPage(
    apiClient: ApiClient,
    httpClient: HttpClient,
    catalogViewModel: viewmodels.CatalogViewModel? = null,
    onProductSelected: (String) -> Unit,
    onTryOnRequested: (ProductItem) -> Unit,
    onMediaGenerated: (String, String) -> Unit,
    userLocation: String? = null,
    searchRadius: Int = 25,
    onRequestLocationPermission: () -> Unit = {},
    onShareRequested: (String) -> Unit = {},
    onAskAI: (String) -> Unit = {},
    onCheckoutRequested: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var products by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    val convexApi = remember { network.ConvexApi() }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val resolvedCatalogViewModel = catalogViewModel ?: remember { viewmodels.CatalogViewModel(scope, convexApi) }

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            products = convexApi.fetchRecommendedProducts()
        } catch (
            e: Exception,
        ) {
            errorMessage = "Failed to load products: ${e.message}"
        } finally {
            isLoading = false
        }
    }

    val retry = {
        scope.launch {
            isLoading = true
            errorMessage = null
            try {
                products = convexApi.fetchRecommendedProducts()
            } catch (
                e: Exception,
            ) {
                errorMessage = "Failed to load products: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    ProductCatalogScreen(
        products = products,
        searchQuery = searchQuery,
        onSearchQueryChange = { searchQuery = it },
        onSearch = { query ->
            scope.launch {
                isLoading = true
                errorMessage = null
                runCatching { convexApi.searchProducts(query, userLocation) }
                    .onSuccess { products = it }
                    .onFailure { errorMessage = "External product search is unavailable right now. Please try again." }
                isLoading = false
            }
        },
        isLoading = isLoading,
        errorMessage = errorMessage,
        httpClient = httpClient,
        onProductSelected = onProductSelected,
        onTryOnRequested = onTryOnRequested,
        onMediaGenerated = onMediaGenerated,
        userLocation = userLocation,
        searchRadius = searchRadius,
        onRequestLocationPermission = onRequestLocationPermission,
        onShareRequested = onShareRequested,
        onAskAI = onAskAI,
        onCheckoutRequested = onCheckoutRequested,
        apiClient = apiClient,
        onRetry = { retry() },
        catalogViewModel = resolvedCatalogViewModel,
        modifier = modifier.windowInsetsPadding(WindowInsets.safeDrawing),
    )
}
