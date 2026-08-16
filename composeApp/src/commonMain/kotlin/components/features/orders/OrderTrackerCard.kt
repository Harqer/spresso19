package components.features.orders

import components.features.grocery.toPriceString
import components.models.*

import components.shared.AnimatedTicketCard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.AssignmentReturn
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.shared.GoogleWalletButton
import network.models.OrderRecord
import components.features.grocery.toPriceString

@Composable
fun OrderTrackerCard(
    order: OrderRecord,
    onAskAI: (String) -> Unit,
    onSetReminder: () -> Unit,
    onReturnClick: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Order #${order.id.take(8)}", fontWeight = FontWeight.Bold, fontSize = 14.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                AssistChip(onClick = { TODO("Implement order status click action") }, label = { Text(order.status, fontSize = 10.sp, fontWeight = FontWeight.Bold) }, leadingIcon = { Icon(Icons.Outlined.LocalShipping, null, modifier = Modifier.size(14.dp)) })
            }
            Surface(modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceContainerLowest, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Outlined.LocalShipping, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        Text("Logistics & Tracking", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text("STATUS", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(order.trackingStatus ?: "In Transit", fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        Surface(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text("EST. ARRIVAL", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(order.estimatedDelivery ?: "Today", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
            AnimatedTicketCard(
                title = "SPRESSO VIP ORDER PASS", subtitle = "ORDER #${order.id.take(8)}", attendeeName = "VIP CUSTOMER", date = "AUG 13, 2026", ticketCode = "PASS-${order.id.take(12)}"
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onSetReminder) { Icon(if (order.reminderSet) Icons.Outlined.NotificationsActive else Icons.Outlined.NotificationAdd, null, tint = MaterialTheme.colorScheme.primary) }
                    IconButton(onClick = onReturnClick) { Icon(Icons.AutoMirrored.Outlined.AssignmentReturn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                    IconButton(onClick = { onAskAI("Where is order ${order.id}?") }) { Icon(Icons.Outlined.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary) }
                    GoogleWalletButton(onClick = { TODO("Implement Google Wallet integration") })
                }
                Text("$${order.totalAmount.toPriceString()}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
            }
        }
    }
}
