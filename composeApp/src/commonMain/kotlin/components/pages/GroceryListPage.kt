package components.pages

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import components.molecules.IngredientChecklistCard
import components.molecules.StoreLocationHeader
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

    Column(modifier = modifier.fillMaxSize().background(Color(0xFFF8FAF8))) {
        StoreLocationHeader(storeName = "Local Market Deals", totalEstimated = totalEstimated, itemCount = items.size)

        Surface(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), color = Color.White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFD8EBD7))) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF386633), modifier = Modifier.size(20.dp))
                    Text("Bargain Chef Recipe Sourcing", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF18211E))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(value = recipePrompt, onValueChange = { recipePrompt = it }, placeholder = { Text("Recipe idea...", fontSize = 12.sp) }, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(12.dp))
                    Button(
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
                                } catch (e: Exception) { recipeStatusMessage = "Recipe ready" }
                                finally { isGeneratingRecipe = false; recipePrompt = "" }
                            }
                        },
                        enabled = !isGeneratingRecipe, modifier = Modifier.height(48.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633))
                    ) { Text("Source", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                }
                recipeStatusMessage?.let { Text(it, fontSize = 11.sp, color = Color(0xFF386633), fontWeight = FontWeight.SemiBold) }
            }
        }

        Surface(modifier = Modifier.fillMaxWidth(), color = Color.White, border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFD8EBD7))) {
            Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(value = newItemName, onValueChange = { newItemName = it }, placeholder = { Text("Add an item...", fontSize = 13.sp) }, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(12.dp))
                Button(onClick = { if (newItemName.isNotBlank()) { items = listOf(GroceryItem("c-${items.size}", newItemName, 1, "item", "Produce", 0.0)) + items; newItemName = "" } }, modifier = Modifier.height(48.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633))) { Text("Add") }
            }
        }

        ScrollableTabRow(selectedTabIndex = categories.indexOf(selectedCategory), containerColor = Color.White, edgePadding = 16.dp, divider = {}, indicator = {}) {
            categories.forEach { cat ->
                val isSelected = selectedCategory == cat
                Tab(selected = isSelected, onClick = { selectedCategory = cat }, modifier = Modifier.padding(vertical = 12.dp, horizontal = 4.dp).clip(RoundedCornerShape(20.dp)).background(if (isSelected) Color(0xFF386633) else Color.Transparent)) {
                    Text(cat, color = if (isSelected) Color.White else Color(0xFF5E635F), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                }
            }
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val filteredItems = if (selectedCategory == "All") items else items.filter { it.category == selectedCategory }
            items(filteredItems) { item ->
                IngredientChecklistCard(item = item, onToggle = { id -> items = items.map { if (it.id == id) it.copy(checked = !it.checked) else it } }, onDelete = { id -> items = items.filter { it.id != id } }, onAskAI = { onAskAI("Find deals for ${item.name}") })
            }
        }
    }
}

fun Double.toPriceString(): String {
    val rounded = (this * 100).toInt()
    return "${rounded / 100}.${(rounded % 100).toString().padStart(2, '0')}"
}

