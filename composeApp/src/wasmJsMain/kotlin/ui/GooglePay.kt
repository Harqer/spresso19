package ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text

@Composable
actual fun GooglePayButton(
    amount: String,
    enabled: Boolean,
    onResult: (GooglePayResult) -> Unit,
    modifier: Modifier,
) {
    OutlinedButton(
        onClick = { onResult(GooglePayResult(errorMessage = "Google Pay checkout is unavailable in the web app.")) },
        enabled = enabled,
        modifier = modifier,
    ) {
        Text("Google Pay unavailable")
    }
}

@Composable
actual fun GoogleWalletSaveButton(
    passId: String,
    modifier: Modifier,
) {
    Text("Google Wallet is unavailable in the web app.", modifier = modifier)
}
