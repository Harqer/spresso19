package components.features.grocery.components

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.shared.widgets.SpressoListItem
import components.features.grocery.toPriceString
import kotlinx.coroutines.launch
import network.ApiClient
import network.models.GroceryItem
import network.SpressoBackend

@Composable
fun GroceryListWidget(
    initialItems: List<GroceryItem> = emptyList(),
    apiClient: ApiClient = remember { ApiClient() },
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var items by remember { mutableStateOf(initialItems) }
    var newItemName by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()
    val categories = emptyList<String>()

    val snackbarHostState = remember { SnackbarHostState() }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
    ) {
        GroceryAddItemRow(
            newItemName = newItemName,
            onNameChange = { newItemName = it },
            onAdd = { 
                scope.launch { 
                    try {
                        SpressoBackend.addGroceryItem(listId = "default", productName = newItemName, productId = null, addedVia = "APP")
                        newItemName = ""
                        // In a real app we'd fetch updated items here, but relying on reactive flow or refreshing.
                    } catch(e: Exception) {
                        snackbarHostState.showSnackbar("Error: ${e.message}")
                    }
                } 
            }
        )

        GroceryCategoryFilter(
            categories = categories,
            selectedCategory = selectedCategory,
            onCategorySelected = { selectedCategory = it }
        )

        val filteredItems = if (selectedCategory == "All") items else items.filter { it.category == selectedCategory }
        
        if (filteredItems.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("Your list is empty", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Start adding some groceries above!", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                filteredItems.forEach { item ->
                    SpressoListItem(
                        title = item.name,
                        subtitle = "${item.category} • $${item.estimatedPrice.toPriceString()}",
                        leadingIcon = if (item.checked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                        onClick = { 
                            scope.launch { 
                                try {
                                    SpressoBackend.toggleGroceryItem(itemId = item.id, isPurchased = !item.checked)
                                } catch(e: Exception) {
                                    snackbarHostState.showSnackbar("Error: ${e.message}")
                                }
                            }
                        },
                        trailingContent = {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                IconButton(onClick = { 
                                    onAskAI("Find deals for ${item.name}") 
                                }) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = "AI", tint = MaterialTheme.colorScheme.primary)
                                }
                                IconButton(onClick = { 
                                    scope.launch { 
                                        try {
                                            SpressoBackend.deleteGroceryItem(itemId = item.id)
                                        } catch(e: Exception) {
                                            snackbarHostState.showSnackbar("Error: ${e.message}")
                                        }
                                    }
                                }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}
