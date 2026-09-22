package components.features.catalog

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import io.ktor.client.HttpClient
import network.ConvexApi
import theme.AppTheme

@Preview
@Composable
fun ProductCatalogPagePreview() {
    AppTheme {
        ProductCatalogPage(
            apiClient = ConvexApi(),
            httpClient = HttpClient(),
            onProductSelected = {},
            onTryOnRequested = {},
            onMediaGenerated = { _, _ -> },
            userLocation = null,
        )
    }
}
