package components.features.orders

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
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
    val convexApi = remember { network.ConvexApi() }

    LaunchedEffect(Unit) {
        try {
            orders = convexApi.fetchOrders()
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
            horizontalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
                OrderTrackerHeroHeader()
            }

            returnResultMessage?.let { msg ->
                item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
                    OrderReturnResultCard(msg = msg, onDismiss = { returnResultMessage = null })
                }
            }

            if (loadError != null) {
                item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
                    Text(
                        text = loadError!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            } else if (!isLoading && orders.isEmpty()) {
                item(span = { GridItemSpan(this.maxCurrentLineSpan) }) {
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
                                    val success =
                                        convexApi.setOrderReminder(
                                            orderId = orderId,
                                            reminderTime =
                                                kotlin.time.Clock.System
                                                    .now()
                                                    .toString(),
                                        )
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
                        val success = convexApi.requestOrderReturn(orderId = orderId, reason = reason)
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
