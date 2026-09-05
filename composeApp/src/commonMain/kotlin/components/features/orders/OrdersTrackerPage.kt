package components.features.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.dp
import components.models.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonPrimitive
import network.ApiClient
import network.models.OrderRecord

@Composable
fun OrdersTrackerPage(
    apiClient: ApiClient = remember { ApiClient() },
    onAskAI: (String) -> Unit = {},
    onSetReminder: (String) -> Unit = {},
    onInitiateReturn: (String, String) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier,
) {
    var orders by remember { mutableStateOf<List<OrderRecord>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var selectedOrderForReturn by remember { mutableStateOf<String?>(null) }
    var returnReason by remember { mutableStateOf("") }
    var isSubmittingReturn by remember { mutableStateOf(false) }
    var returnResultMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            orders = apiClient.fetchOrders()
        } catch (e: Exception) {
            loadError = "Unable to load your orders. Please try again."
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        val layoutDirection = LocalLayoutDirection.current
        LazyVerticalGrid(
            columns = GridCells.Adaptive(300.dp),
            modifier =
                Modifier
                    .fillMaxSize()
                    .consumeWindowInsets(innerPadding),
            contentPadding =
                PaddingValues(
                    start = innerPadding.calculateStartPadding(layoutDirection) + 24.dp,
                    top = innerPadding.calculateTopPadding() + 24.dp,
                    end = innerPadding.calculateEndPadding(layoutDirection) + 24.dp,
                    bottom = innerPadding.calculateBottomPadding() + 24.dp,
                ),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            item {
                OrderTrackerHeroHeader()
            }

            returnResultMessage?.let { msg ->
                item {
                    OrderReturnResultCard(msg = msg, onDismiss = { returnResultMessage = null })
                }
            }

            if (loadError != null) {
                item {
                    Text(
                        text = loadError!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            } else if (!isLoading && orders.isEmpty()) {
                item {
                    OrderTrackerEmptyState()
                }
            } else {
                items(orders) { order ->
                    OrderRecordCard(
                        order = order,
                        apiClient = apiClient,
                        onSetReminder = { orderId ->
                            scope.launch {
                                try {
                                    val response = apiClient.setOrderReminder(
                                        orderId = orderId,
                                        reminderTime = kotlinx.datetime.Clock.System.now().toString(),
                                    )
                                    val success = response["success"]?.jsonPrimitive?.boolean == true
                                    if (success) {
                                        orders = orders.map { order -> if (order.id == orderId) order.copy(reminderSet = true) else order }
                                        onSetReminder(orderId)
                                    } else {
                                        loadError = "Unable to set this reminder. Please try again."
                                    }
                                } catch (e: Exception) {
                                    loadError = "Unable to set this reminder. Please try again."
                                }
                            }
                        },
                        onInitiateReturn = { orderId -> selectedOrderForReturn = orderId },
                        onAskAI = onAskAI,
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
                        val response = apiClient.requestOrderReturn(orderId = orderId, reason = reason)
                        val success = response["success"]?.jsonPrimitive?.boolean == true
                        if (success) {
                            returnResultMessage = "Return request successfully submitted."
                        } else {
                            returnResultMessage = "Failed to submit return request."
                        }
                        selectedOrderForReturn = null
                        returnReason = ""
                    } catch (e: Exception) {
                        returnResultMessage = "Failed to submit return: ${e.message}"
                    } finally {
                        isSubmittingReturn = false
                    }
                }
            },
        )
    }
}
