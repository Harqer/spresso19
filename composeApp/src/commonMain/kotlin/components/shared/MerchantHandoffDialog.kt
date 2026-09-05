package components.shared

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import network.models.HITLPayload

@Composable
fun MerchantHandoffDialog(
    payload: HITLPayload?,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (payload == null) return

    val merchantUrl = payload.product.merchantUrl?.takeIf { it.startsWith("https://") }
    val uriHandler = LocalUriHandler.current

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier.fillMaxWidth(0.92f),
        shape = RoundedCornerShape(24.dp),
        title = { Text("Continue at the merchant") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(payload.product.name, style = MaterialTheme.typography.titleMedium)
                Text(
                    "Review the latest price, availability, delivery details, and payment with the merchant.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        },
        confirmButton = {
            Button(
                enabled = merchantUrl != null,
                onClick = {
                    merchantUrl?.let(uriHandler::openUri)
                    onDismiss()
                },
            ) {
                Text("Open merchant listing")
            }
        },
        dismissButton = {
            Button(onClick = onDismiss) { Text("Not now") }
        },
    )
}
