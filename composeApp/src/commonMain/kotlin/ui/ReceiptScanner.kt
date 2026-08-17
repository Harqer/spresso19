package ui

import androidx.compose.runtime.Composable

@Composable
expect fun rememberReceiptScanner(
    onResult: (merchant: String, amount: String) -> Unit,
    onError: (String) -> Unit
): (ByteArray) -> Unit
