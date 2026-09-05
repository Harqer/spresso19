package components.features.grocery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.catalog.StoreLocationHeader
import components.models.*
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.shared.widgets.SpressoListItem
import kotlinx.coroutines.launch
import network.ApiClient
import network.models.GroceryItem

@Composable
fun GroceryListPage(
    initialItems: List<GroceryItem> = emptyList(),
    apiClient: ApiClient = remember { ApiClient() },
    listId: String? = null,
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var items by remember { mutableStateOf(initialItems) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var newItemName by remember { mutableStateOf("") }
    var recipePrompt by remember { mutableStateOf("") }
    var isGeneratingRecipe by remember { mutableStateOf(false) }
    var recipeStatusMessage by remember { mutableStateOf<String?>(null) }
    var selectedCategory by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()
    val categories = listOf("All", "Produce", "Dairy", "Bakery", "Pantry", "Beverages")
    val totalEstimated = items.filter { !it.checked }.sumOf { it.estimatedPrice * it.quantity }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        if (listId.isNullOrBlank()) {
            loadError = "Your grocery list is unavailable right now. Please try again later."
            isLoading = false
            return@LaunchedEffect
        }
        try {
            items = apiClient.fetchGroceryList(listId)
        } catch (e: Exception) {
            loadError = "Unable to load your grocery list. Please try again."
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Horizontal))
                    .padding(top = innerPadding.calculateTopPadding()),
        ) {
            StoreLocationHeader(storeName = "Local Market Deals", totalEstimated = totalEstimated, itemCount = items.size)

            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                border = androidx.compose.foundation.BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(value = newItemName, onValueChange = {
                        newItemName = it
                    }, placeholder = {
                        Text(
                            "Add an item...",
                            fontSize = 13.sp,
                        )
                    }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                    SpressoButton(
                        text = "Add",
                        onClick = {
                            scope.launch {
                                if (newItemName.isNotBlank()) {
                                    val activeListId = listId
                                    if (activeListId == null) {
                                        snackbarHostState.showSnackbar("Your grocery list is unavailable right now.")
                                        return@launch
                                    }
                                    try {
                                        val success = apiClient.addGroceryItem(
                                            listId = activeListId,
                                            productName = newItemName,
                                            productId = null,
                                            addedVia = "MANUAL_INPUT",
                                        )
                                        if (success) {
                                            newItemName = ""
                                            items = apiClient.fetchGroceryList(activeListId)
                                        } else {
                                            snackbarHostState.showSnackbar("Unable to add this item right now. Please try again.")
                                        }
                                    } catch (e: Exception) {
                                        snackbarHostState.showSnackbar("Unable to add this item right now. Please try again.")
                                    }
                                }
                            }
                        },
                        modifier = Modifier,
                        variant = SpressoButtonVariant.PRIMARY,
                        trackingId = "grocery_add_item",
                        trackingAction = "click",
                    )
                }
            }

            LazyRow(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(categories) { cat ->
                    val isSelected = selectedCategory == cat
                    TextButton(
                        onClick = { selectedCategory = cat },
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.textButtonColors(
                            containerColor = if (isSelected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface,
                            contentColor = if (isSelected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                    ) {
                        Text(cat, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium)
                    }
                }
            }

            loadError?.let { message ->
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }

            LazyVerticalGrid(
                columns = GridCells.Adaptive(300.dp),
                modifier =
                    Modifier
                        .fillMaxSize(),
                contentPadding =
                    PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = 16.dp,
                        bottom = innerPadding.calculateBottomPadding() + 16.dp,
                    ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val filteredItems = if (selectedCategory == "All") items else items.filter { it.category == selectedCategory }
                items(filteredItems) { item ->
                    SpressoListItem(
                        title = item.name,
                        subtitle = "${item.category} • $${item.estimatedPrice.toPriceString()}",
                        leadingIcon = if (item.checked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                        onClick = {
                            scope.launch {
                                apiClient.recordInteraction("grocery_toggle_${item.id}", "click")
                                val success = runCatching { apiClient.toggleGroceryItem(item.id, !item.checked) }.getOrDefault(false)
                                if (!success) {
                                    snackbarHostState.showSnackbar("Unable to update item right now. Please try again.")
                                } else {
                                    items = items.map { if (it.id == item.id) it.copy(checked = !it.checked) else it }
                                }
                            }
                        },
                        trailingContent = {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                IconButton(onClick = {
                                    scope.launch { apiClient.recordInteraction("grocery_ai_deals_${item.id}", "click") }
                                    onAskAI("Find deals for ${item.name}")
                                }) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = "Ask Spresso", tint = MaterialTheme.colorScheme.primary)
                                }
                                IconButton(onClick = {
                                    scope.launch {
                                        apiClient.recordInteraction("grocery_delete_${item.id}", "click")
                                        val success = runCatching { apiClient.deleteGroceryItem(item.id) }.getOrDefault(false)
                                        if (!success) {
                                            snackbarHostState.showSnackbar("Unable to delete item right now. Please try again.")
                                        } else {
                                            items = items.filter { it.id != item.id }
                                        }
                                    }
                                }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        },
                    )
                }
            }
        }
    }
}

fun Double.toPriceString(): String {
    val rounded = (this * 100).toInt()
    return "${rounded / 100}.${(rounded % 100).toString().padStart(2, '0')}"
}
