package com.spresso.xr.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.xr.glimmer.Icon
import androidx.xr.glimmer.ListItem
import androidx.xr.glimmer.Text
import androidx.xr.glimmer.stack.VerticalStack
import network.models.GroceryItem

@Composable
fun GroceryListStack(
    items: List<GroceryItem> = emptyList(),
    modifier: Modifier = Modifier,
) {
    VerticalStack(
        modifier = modifier,
    ) {
        if (items.isEmpty()) {
            item { Text("No items") }
        } else {
            items.forEach { groceryItem ->
                item {
                    ListItem(
                        supportingLabel = { Text("${groceryItem.quantity} ${groceryItem.unit}") },
                        leadingIcon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Item") },
                        trailingIcon = { Text("$${"%.2f".format(groceryItem.estimatedPrice)}") },
                    ) {
                        Text(groceryItem.name)
                    }
                }
            }
        }
    }
}
