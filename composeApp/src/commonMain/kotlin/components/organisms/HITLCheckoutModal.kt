package components.organisms

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.pages.toPriceString
import network.models.HITLPayload

@Composable
fun HITLCheckoutModal(
    payload: HITLPayload?,
    onDismiss: () -> Unit,
    onConfirmPurchase: (paymentMethod: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (payload == null) return

    var selectedPaymentMethod by remember { mutableStateOf("Google Pay") }
    var biometricVerified by remember { mutableStateOf(false) }
    var isAuthenticating by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier.fillMaxWidth(0.92f),
        shape = RoundedCornerShape(24.dp),
        containerColor = Color.White,
        title = {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(color = Color(0xFFE8F3E8), shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Default.Fingerprint, null, tint = Color(0xFF386633), modifier = Modifier.padding(8.dp).size(24.dp))
                    }
                    Column {
                        Text("Biometric Authorization", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Human-in-the-Loop Safeguard", fontSize = 10.sp, color = Color(0xFF5E635F))
                    }
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, null, tint = Color(0xFF5E635F)) }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Summary Card
                Surface(color = Color(0xFFF2F8F2), shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Color(0xFFD8EBD7))) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(payload.product.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            Text("Qty: ${payload.quantity}", fontSize = 12.sp, color = Color(0xFF5E635F))
                        }
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("SKU: ${payload.product.sku}", fontSize = 10.sp, color = Color(0xFF8A928C))
                            Text("Free Express Delivery", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF386633))
                        }
                        HorizontalDivider(color = Color(0xFFD8EBD7))
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Total Cost:", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text("$${payload.totalAmount.toPriceString()}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF386633))
                        }
                    }
                }

                // Payment Settlement Selector
                Text("Select Settlement Method:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF18211E))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Google Pay", "Coinbase USDC", "Card").forEach { method ->
                        val isSelected = selectedPaymentMethod == method
                        Surface(
                            modifier = Modifier.weight(1f).clickable { selectedPaymentMethod = method },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) Color(0xFFE8F3E8) else Color(0xFFF8FAF8),
                            border = BorderStroke(1.dp, if (isSelected) Color(0xFF386633) else Color(0xFFD8EBD7))
                        ) {
                            Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    when (method) { "Google Pay" -> Icons.Default.Payment; "Coinbase USDC" -> Icons.Default.CurrencyBitcoin; else -> Icons.Default.CreditCard },
                                    null,
                                    tint = Color(0xFF386633),
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(method, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF18211E), maxLines = 1)
                            }
                        }
                    }
                }

                // Biometric Verification Box
                Surface(color = Color(0xFFF8FAF8), shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, Color(0xFFD8EBD7))) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Default.Lock, null, tint = Color(0xFF386633), modifier = Modifier.size(16.dp))
                                Text("Biometric Lock", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            AssistChip(
                                onClick = {},
                                label = { Text(if (biometricVerified) "Verified" else "Action Required", fontSize = 9.sp) },
                                leadingIcon = { Icon(if (biometricVerified) Icons.Default.Check else Icons.Default.Warning, null, modifier = Modifier.size(12.dp)) }
                            )
                        }
                        if (!biometricVerified) {
                            Button(
                                onClick = {
                                    isAuthenticating = true
                                    biometricVerified = true
                                    isAuthenticating = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF386633)),
                                border = BorderStroke(1.dp, Color(0xFF386633))
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
            Button(
                onClick = { onConfirmPurchase(selectedPaymentMethod) },
                enabled = biometricVerified,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633))
            ) {
                Icon(Icons.Default.ShoppingBag, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Confirm Purchase • $${payload.totalAmount.toPriceString()}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    )
}
