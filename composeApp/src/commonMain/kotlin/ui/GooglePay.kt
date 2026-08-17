package ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
expect fun GooglePayButton(
    amount: String,
    onResult: (Boolean, String) -> Unit,
    modifier: Modifier = Modifier
)

@Composable
expect fun GoogleWalletSaveButton(
    passId: String,
    modifier: Modifier = Modifier
)
