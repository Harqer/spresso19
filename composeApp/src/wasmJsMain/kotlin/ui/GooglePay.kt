package ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
actual fun GooglePayButton(
    amount: String,
    onResult: (Boolean, String) -> Unit,
    modifier: Modifier,
) {
    // Stub for Web
}

@Composable
actual fun GoogleWalletSaveButton(
    passId: String,
    modifier: Modifier,
) {
    // Stub for Web
}
