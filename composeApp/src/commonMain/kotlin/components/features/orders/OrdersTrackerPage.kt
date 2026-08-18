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
                    OrderRecordCard(
                        order = order,
                        apiClient = apiClient,
                        onSetReminder = onSetReminder,
                        onInitiateReturn = { orderId -> selectedOrderForReturn = orderId },
                        onAskAI = onAskAI
                    )
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
                        val success = apiClient.createOrder(authorizationId = "return", productId = orderId, quantity = -1, totalAmount = 0.0f, shippingAddress = null, deviceSource = "APP", paymentMethod = "NONE", userConfirmedToken = null)
                        if (success) {
                            returnResultMessage = "Return request successfully submitted."
                        } else {
                            returnResultMessage = "Failed to submit return request."
                        }
                        selectedOrderForReturn = null
                        returnReason = "" 
                    } catch(e: Exception) {
                        returnResultMessage = "Failed to submit return: ${e.message}"
                    } finally { 
                        isSubmittingReturn = false
                    }
                }
            }
        )
    }
}
