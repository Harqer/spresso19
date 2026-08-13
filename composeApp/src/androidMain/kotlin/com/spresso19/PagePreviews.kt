package com.spresso19

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import components.pages.AuthPage
import components.pages.ProductCatalogScreen
import io.ktor.client.HttpClient
import network.ApiClient
import network.ProductItem
import theme.AppTheme

@Preview(showBackground = true, widthDp = 360, heightDp = 800)
@Composable
fun AuthPageSignUpPreviewOfficial() {
    AppTheme {
        AuthPage(initialMode = "register")
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 800)
@Composable
fun AuthPageSignInPreviewAndroid() {
    AppTheme {
        AuthPage(initialMode = "signin")
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 1000)
@Composable
fun ProductCatalogPagePreviewAndroid() {
    val dummyProducts = listOf(
        ProductItem("1", "Winter Jacket", "Spresso", "Apparel", 199.99, ""),
        ProductItem("2", "Running Shoes", "Spresso", "Footwear", 129.99, ""),
        ProductItem("3", "Smart Watch", "Spresso", "Electronics", 299.99, ""),
        ProductItem("4", "Leather Bag", "Spresso", "Accessories", 159.99, "")
    )
    AppTheme {
        ProductCatalogScreen(
            products = dummyProducts,
            isLoading = false,
            errorMessage = null,
            httpClient = HttpClient(),
            onProductSelected = {},
            onTryOnRequested = {},
            userLocation = "New York, NY",
            apiClient = ApiClient()
        )
    }
}
