package components.features.catalog

import components.models.*
import components.features.catalog.screens.ProductCatalogScreen

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
        try { products = apiClient.discoverPersonalizedProducts() }
        catch (e: Exception) { errorMessage = "Failed to load products: ${e.message}" }
        finally { isLoading = false }
    }

    val retry = {
        scope.launch {
            isLoading = true
            errorMessage = null
            try { products = apiClient.discoverPersonalizedProducts() }
            catch (e: Exception) { errorMessage = "Failed to load products: ${e.message}" }
            finally { isLoading = false }
        }
    }

    ProductCatalogScreen(
        products = products, isLoading = isLoading, errorMessage = errorMessage,
        httpClient = httpClient, onProductSelected = onProductSelected,
        onTryOnRequested = onTryOnRequested, userLocation = userLocation, searchRadius = searchRadius,
        onRequestLocationPermission = onRequestLocationPermission, onShareRequested = onShareRequested,
        onAskAI = onAskAI, apiClient = apiClient, onRetry = { retry() }, modifier = modifier.windowInsetsPadding(WindowInsets.safeDrawing)
    )
}

