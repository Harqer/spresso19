package com.spresso19

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import components.features.auth.AuthPage
import components.features.catalog.screens.ProductCatalogScreen
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


