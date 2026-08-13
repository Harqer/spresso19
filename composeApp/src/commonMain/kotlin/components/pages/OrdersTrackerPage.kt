package components.pages

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonPrimitive
import network.ApiClient
import network.models.OrderRecord

@Composable
fun OrdersTrackerPage(
    orders: List<OrderRecord> = emptyList(),
    apiClient: ApiClient = remember { ApiClient() },
    onAskAI: (String) -> Unit = {},
    onSetReminder: (String) -> Unit = {},
    onInitiateReturn: (String, String) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier
) {
    var selectedOrderForReturn by remember { mutableStateOf<String?>(null) }
    var returnReason by remember { mutableStateOf("") }
    var isSubmittingReturn by remember { mutableStateOf(false) }
    var returnResultMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(modifier = modifier.fillMaxSize().background(Color(0xFFF8FAF8))) {
        Surface(modifier = Modifier.fillMaxWidth(), color = Color.White, border = BorderStroke(0.5.dp, Color(0xFFD8EBD7))) {
            Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(color = Color(0xFFE8F3E8), shape = RoundedCornerShape(12.dp)) { Icon(Icons.Default.ReceiptLong, null, tint = Color(0xFF386633), modifier = Modifier.padding(8.dp).size(24.dp)) }
                Column {
                    Text("Order History & Tracking", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF18211E))
                    Text("Track live status, arrival alerts & returns", style = MaterialTheme.typography.bodySmall, color = Color(0xFF5E635F))
                }
            }
        }

        returnResultMessage?.let { msg ->
            Surface(modifier = Modifier.fillMaxWidth().padding(12.dp), color = Color(0xFFE8F3E8), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Color(0xFF386633))) {
                Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF386633))
                        Text(msg, fontSize = 12.sp, color = Color(0xFF18211E), fontWeight = FontWeight.SemiBold)
                    }
                    IconButton(onClick = { returnResultMessage = null }) { Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp)) }
                }
            }
        }

        if (orders.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Inventory2, null, tint = Color(0xFF386633), modifier = Modifier.size(48.dp))
                    Text("No Orders Placed Yet", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                items(orders) { order -> OrderTrackerCard(order = order, onAskAI = onAskAI, onSetReminder = { onSetReminder(order.id) }, onReturnClick = { selectedOrderForReturn = order.id }) }
            }
        }
    }

    selectedOrderForReturn?.let { orderId ->
        AlertDialog(
            onDismissRequest = { if (!isSubmittingReturn) selectedOrderForReturn = null },
            title = { Text("Initiate Return ($orderId)") },
            text = { OutlinedTextField(value = returnReason, onValueChange = { returnReason = it }, placeholder = { Text("Reason") }, modifier = Modifier.fillMaxWidth(), enabled = !isSubmittingReturn) },
            confirmButton = {
                Button(
                    onClick = {
                        val reason = returnReason.ifBlank { "Customer request" }
                        onInitiateReturn(orderId, reason)
                        scope.launch {
                            isSubmittingReturn = true
                            try { returnResultMessage = apiClient.requestOrderReturn(orderId, reason)["message"]?.jsonPrimitive?.content ?: "Return initiated" }
                            catch (e: Exception) { returnResultMessage = "Return requested for order #$orderId" }
                            finally { isSubmittingReturn = false; selectedOrderForReturn = null; returnReason = "" }
                        }
                    },
                    enabled = !isSubmittingReturn, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633))
                ) { Text("Confirm Return") }
            },
            dismissButton = { OutlinedButton(onClick = { selectedOrderForReturn = null }, enabled = !isSubmittingReturn) { Text("Cancel") } }
        )
    }
}

@Composable
private fun OrderTrackerCard(order: OrderRecord, onAskAI: (String) -> Unit, onSetReminder: () -> Unit, onReturnClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, Color(0xFFD8EBD7))) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Order #${order.id.take(8)}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                AssistChip(onClick = {}, label = { Text(order.status, fontSize = 10.sp, fontWeight = FontWeight.Bold) }, leadingIcon = { Icon(Icons.Default.LocalShipping, null, modifier = Modifier.size(14.dp)) })
            }
            Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFF2F8F2), shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Carrier: ${order.carrier ?: "FedEx"} • Status: ${order.trackingStatus ?: "In Transit"}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF386633))
                    Text("Est. Arrival: ${order.estimatedDelivery ?: "Today, 5:00 PM"}", fontSize = 11.sp, color = Color(0xFF386633), fontWeight = FontWeight.Bold)
                }
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = onSetReminder) { Icon(if (order.reminderSet) Icons.Default.NotificationsActive else Icons.Default.NotificationAdd, null, tint = Color(0xFF386633)) }
                    IconButton(onClick = onReturnClick) { Icon(Icons.Default.AssignmentReturn, null, tint = Color(0xFF5E635F)) }
                    IconButton(onClick = { onAskAI("Where is order ${order.id}?") }) { Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF386633)) }
                }
                Text("$${order.totalAmount.toPriceString()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF386633))
            }
        }
    }
}

