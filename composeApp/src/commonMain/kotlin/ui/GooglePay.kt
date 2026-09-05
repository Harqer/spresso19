package ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

data class GooglePayResult(
    val paymentToken: String? = null,
    val errorMessage: String? = null,
) {
    val isSuccess: Boolean get() = paymentToken != null
}

@Composable
expect fun GooglePayButton(
    amount: String,
    enabled: Boolean = true,
    onResult: (GooglePayResult) -> Unit,
    modifier: Modifier = Modifier,
)

@Composable
expect fun GoogleWalletSaveButton(
    passId: String,
    modifier: Modifier = Modifier,
)
