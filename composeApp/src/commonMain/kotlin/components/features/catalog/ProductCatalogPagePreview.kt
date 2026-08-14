package components.features.catalog

import components.models.*

import androidx.compose.runtime.Composable
import io.ktor.client.HttpClient
import network.ApiClient
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

@Preview
@Composable
fun ProductCatalogPagePreview() {
    AppTheme {
        ProductCatalogPage(
            apiClient = ApiClient(),
            httpClient = HttpClient(),
            onProductSelected = {},
            onTryOnRequested = {},
            userLocation = "New York, NY"
        )
    }
}
