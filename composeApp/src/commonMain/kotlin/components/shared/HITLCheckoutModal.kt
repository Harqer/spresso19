package components.shared

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.CurrencyBitcoin
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spresso19.auth.rememberBiometricAuthenticator
import components.features.grocery.toPriceString
import network.models.HITLPayload
import ui.GooglePayButton

@Composable
fun HITLCheckoutModal(
    payload: HITLPayload?,
    onDismiss: () -> Unit,
    onConfirmPurchase: (paymentMethod: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (payload == null) return

    var selectedPaymentMethod by remember { mutableStateOf("Google Pay") }
    var biometricVerified by remember { mutableStateOf(false) }
    var isAuthenticating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val biometricAuthenticator =
        rememberBiometricAuthenticator(
            onSuccess = {
                biometricVerified = true
                isAuthenticating = false
            },
            onError = {
                isAuthenticating = false
            },
        )

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier.fillMaxWidth(0.92f),
        shape = RoundedCornerShape(24.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = RoundedCornerShape(12.dp)) {
                        Icon(
                            Icons.Default.Fingerprint,
                            null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(8.dp).size(24.dp),
                        )
                    }
                    Column {
                        Text("Biometric Authorization", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Security Verification", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                HITLCheckoutSummaryCard(payload)

                // Payment Method Selector
                Text("Select Payment Method:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Google Pay", "Coinbase USDC", "Card").forEach { method ->
                        val isSelected = selectedPaymentMethod == method
                        Surface(
                            modifier = Modifier.weight(1f).clickable { selectedPaymentMethod = method },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLowest,
                            border =
                                BorderStroke(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                                ),
                        ) {
                            Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    when (method) {
                                        "Google Pay" -> Icons.Default.Payment
                                        "Coinbase USDC" -> Icons.Default.CurrencyBitcoin
                                        else -> Icons.Default.CreditCard
                                    },
                                    null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp),
                                )
                                Text(
                                    method,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }

                // Biometric Verification Box
                if (errorMessage != null) {
                    Text(text = errorMessage!!, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainerLowest,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Default.Lock, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                Text("Biometric Lock", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            AssistChip(
                                onClick = {
                                    if (!biometricVerified) {
                                        isAuthenticating = true
                                        biometricAuthenticator.authenticate()
                                    }
                                },
                                label = { Text(if (biometricVerified) "Verified" else "Action Required", fontSize = 9.sp) },
                                leadingIcon = {
                                    Icon(
                                        if (biometricVerified) Icons.Default.Check else Icons.Default.Warning,
                                        null,
                                        modifier = Modifier.size(12.dp),
                                    )
                                },
                            )
                        }
                        if (!biometricVerified) {
                            Button(
                                onClick = {
                                    isAuthenticating = true
                                    biometricAuthenticator.authenticate()
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors =
                                    ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.surface,
                                        contentColor = MaterialTheme.colorScheme.primary,
                                    ),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                            ) {
                                Icon(Icons.Default.Fingerprint, null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Authenticate with Biometrics", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (biometricVerified && selectedPaymentMethod == "Google Pay") {
                GooglePayButton(
                    amount = payload.totalAmount.toPriceString(),
                    onResult = { success, msg ->
                        if (success) {
                            onConfirmPurchase("Google Pay - Success")
                        } else {
                            errorMessage = "Google Pay Failed: $msg"
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                Button(
                    onClick = { onConfirmPurchase(selectedPaymentMethod) },
                    enabled = biometricVerified,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                ) {
                    Icon(Icons.Default.ShoppingBag, null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Confirm Purchase • $${payload.totalAmount.toPriceString()}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
    )
}
