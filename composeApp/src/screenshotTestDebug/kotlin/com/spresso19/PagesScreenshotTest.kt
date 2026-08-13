package com.spresso19

import androidx.compose.runtime.Composable
import com.android.tools.screenshot.PreviewTest
import org.jetbrains.compose.ui.tooling.preview.Preview
import components.pages.AuthPage
import components.pages.ProductCatalogPage
import io.ktor.client.HttpClient
import network.ApiClient
import theme.AppTheme

class PagesScreenshotTest {

    @PreviewTest
    @Preview
    @Composable
    fun AuthPageSignUpScreenshot() {
        AppTheme {
            AuthPage(initialMode = "register")
        }
    }

    @PreviewTest
    @Preview
    @Composable
    fun HomePageScreenshot() {
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
}
