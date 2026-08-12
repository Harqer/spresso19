package components.pages

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.CategoryTilesBar
import components.molecules.ProductActions
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
    onShareRequested: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var products by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
    var selectedCategoryId by remember { mutableStateOf("all") }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var activeDetailProduct by remember { mutableStateOf<ProductItem?>(null) }
    var checkoutStatus by remember { mutableStateOf<String?>(null) }

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

    Column(modifier = modifier.fillMaxSize()) {
        CategoryTilesBar(
            selectedCategoryId = selectedCategoryId,
            onCategorySelected = { selectedCategoryId = it }
        )

        Box(
            modifier = Modifier.fillMaxSize(),
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
                            onProductClick = {
                                activeDetailProduct = product
                                onProductSelected(product.id)
                            },
                            onTryOnClick = { onTryOnRequested(product) },
                            onAddToCartClick = { activeDetailProduct = product }
                        )
                    }
                }
            }

            if (activeDetailProduct != null) {
                val prod = activeDetailProduct!!
                AlertDialog(
                    onDismissRequest = { activeDetailProduct = null },
                    title = { Text(prod.name) },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${prod.brand} • $${prod.price}", style = MaterialTheme.typography.titleMedium)
                            if (checkoutStatus != null) {
                                Text(checkoutStatus!!, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                            }
                            ProductActions(
                                onVirtualTryOnClick = {
                                    activeDetailProduct = null
                                    onTryOnRequested(prod)
                                },
                                onSpin360Click = {
                                    scope.launch {
                                        try {
                                            apiClient.requestSpin360(prod.id)
                                            checkoutStatus = "Spin 360 generated!"
                                        } catch (e: Exception) {
                                            checkoutStatus = "Spin 360 note: ${e.message}"
                                        }
                                    }
                                },
                                onLikeClick = { checkoutStatus = "Saved to favorites!" },
                                onShareClick = { onShareRequested(prod.name) }
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                scope.launch {
                                    try {
                                        val res = apiClient.confirmCheckoutWithToken(prod.id, 1, "TOKEN_CONFIRMED", "123 Main St")
                                        checkoutStatus = res.message ?: "Order confirmed!"
                                    } catch (e: Exception) {
                                        checkoutStatus = "Checkout note: ${e.message}"
                                    }
                                }
                            }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Default.ShoppingCart, contentDescription = null)
                                Text("1-Tap Buy Now")
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { activeDetailProduct = null }) {
                            Text("Close")
                        }
                    }
                )
            }
        }
    }
}
