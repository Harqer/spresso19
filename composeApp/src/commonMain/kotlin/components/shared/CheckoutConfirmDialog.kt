package components.shared

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import utils.toPriceString
import viewmodels.CheckoutDraft
import viewmodels.CheckoutPhase

/**
 * Biometric-gated checkout confirmation. The quoted amount shown here comes
 * exclusively from the backend's merchant verification — never from client
 * numbers — and confirmation requires a strong device step-up before the
 * off-session charge is requested.
 */
@Composable
fun CheckoutConfirmDialog(
    draft: CheckoutDraft,
    phase: CheckoutPhase,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val busy = phase is CheckoutPhase.Charging
    val amount = draft.quote.amountCents / 100.0

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        modifier = modifier.fillMaxWidth(0.92f),
        shape = RoundedCornerShape(24.dp),
        title = {
            Text(if (phase is CheckoutPhase.Succeeded) "Purchase complete" else "Confirm purchase")
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (phase is CheckoutPhase.Succeeded) {
                    val confirmation = phase.confirmation
                    Text(draft.product.name, style = MaterialTheme.typography.titleMedium)
                    Text(
                        "${confirmation.currency} ${confirmation.amountCents / 100.0} charged to your ${confirmation.brand} ending in ${confirmation.last4}.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        "Track this order anytime under Orders.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    Text(draft.product.name, style = MaterialTheme.typography.titleMedium)
                    if (draft.quantity > 1) {
                        Text(
                            "Quantity: ${draft.quantity}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Merchant-verified total", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            "${draft.quote.currency} ${amount.toPriceString()}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    Text(
                        "Verified at the merchant ${draft.quote.observedAt.take(10)}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    Text(
                        "Your saved card is charged after you confirm with biometrics on this device.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    when (phase) {
                        is CheckoutPhase.Failed -> {
                            Text(
                                phase.message,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                            )
                            if (phase.retryable) {
                                Text(
                                    "You can try confirming again.",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            } else {
                                Text(
                                    "This attempt is closed — start a new checkout to try again.",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        else -> Unit
                    }
                }
            }
        },
        confirmButton = {
            if (phase is CheckoutPhase.Succeeded) {
                Button(onClick = onDismiss) { Text("Done") }
            } else {
                Button(
                    enabled = !busy,
                    onClick = onConfirm,
                ) {
                    if (busy) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Text("  Charging…")
                    } else {
                        Text("Confirm with biometrics")
                    }
                }
            }
        },
        dismissButton = {
            if (phase !is CheckoutPhase.Succeeded) {
                OutlinedButton(enabled = !busy, onClick = onDismiss) { Text("Cancel") }
            }
        },
    )
}
