package components.features.orders

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.automirrored.outlined.AssignmentReturn
import components.features.grocery.toPriceString
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.shared.widgets.MediaActionCard
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.features.orders.OrderReturnDialog
import components.features.orders.OrderReturnResultCard
import components.features.orders.OrderTrackerEmptyState
import components.features.orders.OrderTrackerHeroHeader
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

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        val layoutDirection = LocalLayoutDirection.current
        LazyVerticalGrid(
            columns = GridCells.Adaptive(300.dp),
            modifier = Modifier
                .fillMaxSize()
                .consumeWindowInsets(innerPadding),
            contentPadding = PaddingValues(
                start = innerPadding.calculateStartPadding(layoutDirection) + 24.dp,
                top = innerPadding.calculateTopPadding() + 24.dp,
                end = innerPadding.calculateEndPadding(layoutDirection) + 24.dp,
                bottom = innerPadding.calculateBottomPadding() + 24.dp
            ),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                OrderTrackerHeroHeader()
            }

            returnResultMessage?.let { msg ->
                item {
                    OrderReturnResultCard(msg = msg, onDismiss = { returnResultMessage = null })
                }
            }

            if (orders.isEmpty()) {
                item {
                    OrderTrackerEmptyState()
                }
            } else {
                items(orders) { order ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                components.core.NetworkImage(
                                    url = order.items.firstOrNull()?.product?.imageUrl ?: "https://storage.googleapis.com/spresso-assets/default-product.png",
                                    contentDescription = null,
                                    modifier = Modifier.size(64.dp),
                                    client = apiClient.client
                                )
                                Column {
                                    Text("Order #${order.id.take(8)}", style = MaterialTheme.typography.titleMedium)
                                    Text("${order.status} • ${order.trackingStatus ?: "In Transit"}\nEst: ${order.estimatedDelivery ?: "Today"} • Total: $${order.totalAmount.toPriceString()}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            @OptIn(ExperimentalLayoutApi::class)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                SpressoButton(
                                    text = "Reminder",
                                    icon = if (order.reminderSet) Icons.Outlined.NotificationsActive else Icons.Outlined.NotificationAdd,
                                    onClick = { onSetReminder(order.id) },
                                    variant = SpressoButtonVariant.GHOST,
                                    trackingId = "order_reminder_${order.id}",
                                    trackingAction = "click"
                                )
                                SpressoButton(
                                    text = "Return",
                                    icon = Icons.AutoMirrored.Outlined.AssignmentReturn,
                                    onClick = { selectedOrderForReturn = order.id },
                                    variant = SpressoButtonVariant.GHOST,
                                    trackingId = "order_return_${order.id}",
                                    trackingAction = "click"
                                )
                                SpressoButton(
                                    text = "Ask AI",
                                    icon = Icons.Outlined.AutoAwesome,
                                    onClick = { onAskAI("Where is order ${order.id}?") },
                                    variant = SpressoButtonVariant.GHOST,
                                    trackingId = "order_ask_ai_${order.id}",
                                    trackingAction = "click"
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    selectedOrderForReturn?.let { orderId ->
        OrderReturnDialog(
            orderId = orderId,
            returnReason = returnReason,
            onReturnReasonChange = { returnReason = it },
            isSubmittingReturn = isSubmittingReturn,
            onDismissRequest = { if (!isSubmittingReturn) selectedOrderForReturn = null },
            onConfirmReturn = {
                val reason = returnReason.ifBlank { "Customer return request" }
                onInitiateReturn(orderId, reason)
                scope.launch {
                    isSubmittingReturn = true
                    try { 
                        val resMsg = apiClient.requestOrderReturn(orderId, reason)["message"]?.jsonPrimitive?.content 
                        returnResultMessage = resMsg ?: "Return initiated for $orderId. Prepaid shipping label dispatched."
                    } catch (e: Exception) { 
                        returnResultMessage = "Return request failed: ${e.message}" 
                    } finally { 
                        isSubmittingReturn = false
                        selectedOrderForReturn = null
                        returnReason = "" 
                    }
                }
            }
        )
    }
}
