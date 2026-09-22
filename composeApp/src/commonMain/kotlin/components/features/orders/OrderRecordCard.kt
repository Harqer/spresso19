package components.features.orders

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.AssignmentReturn
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.NotificationAdd
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import network.ConvexApi
import network.models.OrderRecord
import utils.toPriceString

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OrderRecordCard(
    order: OrderRecord,
    apiClient: ConvexApi,
    onSetReminder: (String) -> Unit,
    onInitiateReturn: (String) -> Unit,
    onAskAI: (String) -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                components.core.NetworkImage(
                    url =
                        order.items
                            .firstOrNull()
                            ?.product
                            ?.imageUrl
                            .orEmpty(),
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    client = apiClient.client,
                )
                Column {
                    Text("Order #${order.id.take(8)}", style = MaterialTheme.typography.titleMedium)
                    Text(
                        buildString {
                            append(order.status)
                            order.trackingStatus?.takeIf { it.isNotBlank() }?.let { append(" · $it") }
                            append("\n")
                            append(
                                order.estimatedDelivery?.takeIf { it.isNotBlank() }?.let { "Estimated arrival: $it" }
                                    ?: "Tracking estimate unavailable",
                            )
                            append(" · Total: $${order.totalAmount.toPriceString()}")
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                SpressoButton(
                    text = "Reminder",
                    icon = if (order.reminderSet) Icons.Outlined.NotificationsActive else Icons.Outlined.NotificationAdd,
                    onClick = { onSetReminder(order.id) },
                    variant = SpressoButtonVariant.GHOST,
                    trackingId = "order_reminder_${order.id}",
                    trackingAction = "click",
                )
                SpressoButton(
                    text = "Return",
                    icon = Icons.AutoMirrored.Outlined.AssignmentReturn,
                    onClick = { onInitiateReturn(order.id) },
                    variant = SpressoButtonVariant.GHOST,
                    trackingId = "order_return_${order.id}",
                    trackingAction = "click",
                )
                SpressoButton(
                    text = "Ask AI",
                    icon = Icons.Outlined.AutoAwesome,
                    onClick = { onAskAI("Where is order ${order.id}?") },
                    variant = SpressoButtonVariant.GHOST,
                    trackingId = "order_ask_ai_${order.id}",
                    trackingAction = "click",
                )
            }
        }
    }
}
