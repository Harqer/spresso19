package components.features.catalog

import androidx.compose.runtime.Composable
import components.models.*
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
            userLocation = "New York, NY",
        )
    }
}
