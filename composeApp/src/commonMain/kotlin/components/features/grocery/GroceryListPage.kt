package components.features.grocery

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.molecules.SpressoListItem
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant
import components.features.catalog.StoreLocationHeader
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import network.ApiClient
import network.models.GroceryItem

@Composable
fun GroceryListPage(
    initialItems: List<GroceryItem> = emptyList(),
    apiClient: ApiClient = remember { ApiClient() },
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var items by remember { mutableStateOf(initialItems) }
    var newItemName by remember { mutableStateOf("") }
    var recipePrompt by remember { mutableStateOf("") }
    var isGeneratingRecipe by remember { mutableStateOf(false) }
    var recipeStatusMessage by remember { mutableStateOf<String?>(null) }
    var selectedCategory by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()
    val categories = listOf("All", "Produce", "Dairy", "Bakery", "Pantry", "Beverages")
    val totalEstimated = items.filter { !it.checked }.sumOf { it.estimatedPrice * it.quantity }

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).windowInsetsPadding(WindowInsets.safeDrawing)) {
        StoreLocationHeader(storeName = "Local Market Deals", totalEstimated = totalEstimated, itemCount = items.size)

        Surface(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), color = Color.White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    Text("Bargain Chef Recipe Sourcing", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(value = recipePrompt, onValueChange = { recipePrompt = it }, placeholder = { Text("Recipe idea...", fontSize = 12.sp) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                    SpressoButton(
                        text = "Source",
                        onClick = {
                            isGeneratingRecipe = true
                            scope.launch {
                                try {
                                    val response = apiClient.generateRecipeBargainChef(recipePrompt.ifBlank { "Budget meal" }, items.map { it.name })
                                    val recipeName = response["recipe"]?.jsonPrimitive?.content ?: "Bargain Chef Meal"
                                    val ingredientsArray = response["ingredients"]?.jsonArray
                                    if (ingredientsArray != null && ingredientsArray.isNotEmpty()) {
                                        items = ingredientsArray.mapIndexed { idx, ing -> GroceryItem("recipe-${items.size + idx}", ing.jsonPrimitive.content, 1, "item", "Pantry", 2.99) } + items
                                    }
                                    recipeStatusMessage = "Sourced for: $recipeName"
                                } catch (e: Exception) { recipeStatusMessage = "Recipe failed: ${e.message}" }
                                finally { isGeneratingRecipe = false; recipePrompt = "" }
                            }
                        },
                        enabled = !isGeneratingRecipe,
                        modifier = Modifier,
                        variant = SpressoButtonVariant.PRIMARY,
                        trackingId = "grocery_recipe_source",
                        trackingAction = "click"
                    )
                }
                recipeStatusMessage?.let { Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold) }
            }
        }

        Surface(modifier = Modifier.fillMaxWidth(), color = Color.White, border = androidx.compose.foundation.BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(value = newItemName, onValueChange = { newItemName = it }, placeholder = { Text("Add an item...", fontSize = 13.sp) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                SpressoButton(
                    text = "Add",
                    onClick = { if (newItemName.isNotBlank()) { items = listOf(GroceryItem("c-${items.size}", newItemName, 1, "item", "Produce", 0.0)) + items; newItemName = "" } },
                    modifier = Modifier,
                    variant = SpressoButtonVariant.PRIMARY,
                    trackingId = "grocery_add_item",
                    trackingAction = "click"
                )
            }
        }

        LazyRow(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories) { cat ->
                val isSelected = selectedCategory == cat
                FilterChip(
                    selected = isSelected,
                    onClick = { selectedCategory = cat },
                    label = { Text(cat, fontWeight = FontWeight.SemiBold) }
                )
            }
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val filteredItems = if (selectedCategory == "All") items else items.filter { it.category == selectedCategory }
            items(filteredItems) { item ->
                SpressoListItem(
                    title = item.name,
                    subtitle = "${item.category} • $${item.estimatedPrice.toPriceString()}",
                    leadingIcon = if (item.checked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                    onClick = { 
                        scope.launch { apiClient.recordInteraction("grocery_toggle_${item.id}", "click") }
                        items = items.map { if (it.id == item.id) it.copy(checked = !it.checked) else it } 
                    },
                    trailingContent = {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(onClick = { 
                                scope.launch { apiClient.recordInteraction("grocery_ai_deals_${item.id}", "click") }
                                onAskAI("Find deals for ${item.name}") 
                            }) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = "AI", tint = MaterialTheme.colorScheme.primary)
                            }
                            IconButton(onClick = { 
                                scope.launch { apiClient.recordInteraction("grocery_delete_${item.id}", "click") }
                                items = items.filter { it.id != item.id } 
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

fun Double.toPriceString(): String {
    val rounded = (this * 100).toInt()
    return "${rounded / 100}.${(rounded % 100).toString().padStart(2, '0')}"



}
