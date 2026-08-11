package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.ProductCard
import io.ktor.client.HttpClient
import kotlinx.coroutines.launch
import network.ApiClient
import network.ProductItem

@Composable
fun ProductCatalogPage(
    apiClient: ApiClient,
    httpClient: HttpClient,
    onProductSelected: (String) -> Unit,
    onTryOnRequested: (ProductItem) -> Unit,
    modifier: Modifier = Modifier
) {
    var products by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    val scope = rememberCoroutineScope()
    
    LaunchedEffect(Unit) {
        scope.launch {
            try {
                products = apiClient.getInventory()
                isLoading = false
            } catch (e: Exception) {
                errorMessage = "Failed to load products: ${e.message}"
                isLoading = false
            }
        }
    }
    
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator()
        } else if (errorMessage != null) {
            Text(text = errorMessage!!, color = MaterialTheme.colorScheme.error)
        } else if (products.isEmpty()) {
            Text(text = "No products found.")
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(products) { product ->
                    ProductCard(
                        product = product,
                        client = httpClient,
                        onProductClick = { onProductSelected(product.id) },
                        onTryOnClick = { onTryOnRequested(product) }
                    )
                }
            }
        }
    }
}
