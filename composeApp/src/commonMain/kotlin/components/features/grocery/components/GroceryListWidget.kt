package components.features.grocery.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.shared.widgets.SpressoListItem
import kotlinx.coroutines.launch
import network.ConvexApi
import network.models.GroceryItem
import utils.toPriceString

@Composable
fun GroceryListWidget(
    initialItems: List<GroceryItem> = emptyList(),
    apiClient: ConvexApi = remember { ConvexApi() },
    listId: String? = null,
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var items by remember { mutableStateOf(initialItems) }
    var newItemName by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()
    val categories = remember(items) { listOf("All") + items.map { it.category }.filter { it.isNotBlank() }.distinct() }

    val snackbarHostState = remember { SnackbarHostState() }

    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background),
    ) {
        GroceryAddItemRow(
            newItemName = newItemName,
            onNameChange = { newItemName = it },
            onAdd = {
                scope.launch {
                    if (newItemName.isBlank()) return@launch
                    try {
                        apiClient.addGroceryItem(newItemName, "Other")
                        newItemName = ""
                        items = apiClient.fetchGroceryList(listId.orEmpty())
                    } catch (e: Exception) {
                        snackbarHostState.showSnackbar("Unable to add this item. Please try again.")
                    }
                }
            },
        )

        GroceryCategoryFilter(
            categories = categories,
            selectedCategory = selectedCategory,
            onCategorySelected = { selectedCategory = it },
        )

        val filteredItems = if (selectedCategory == "All") items else items.filter { it.category == selectedCategory }

        if (filteredItems.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("Your list is empty", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Start adding some groceries above!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                filteredItems.forEach { item ->
                    SpressoListItem(
                        title = item.name,
                        subtitle = "${item.category} • $${item.estimatedPrice.toPriceString()}",
                        leadingIcon = if (item.checked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                        onClick = {
                            scope.launch {
                                try {
                                    apiClient.setGroceryChecked(item.id, !item.checked)
                                    items =
                                        items.map { current ->
                                            if (current.id ==
                                                item.id
                                            ) {
                                                current.copy(checked = !current.checked)
                                            } else {
                                                current
                                            }
                                        }
                                } catch (e: Exception) {
                                    snackbarHostState.showSnackbar("Unable to update this item. Please try again.")
                                }
                            }
                        },
                        trailingContent = {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                IconButton(onClick = {
                                    onAskAI("Find deals for ${item.name}")
                                }) {
                                    Icon(
                                        Icons.Default.AutoAwesome,
                                        contentDescription = "Ask Spresso",
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                }
                                IconButton(onClick = {
                                    scope.launch {
                                        try {
                                            apiClient.removeGroceryItem(item.id)
                                            items = items.filterNot { current -> current.id == item.id }
                                        } catch (e: Exception) {
                                            snackbarHostState.showSnackbar("Unable to delete this item. Please try again.")
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
