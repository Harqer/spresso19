package com.spresso19.xr.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.xr.glimmer.Icon
import androidx.xr.glimmer.ListItem
import androidx.xr.glimmer.Text
import androidx.xr.glimmer.stack.VerticalStack

@Composable
fun GroceryListStack(modifier: Modifier = Modifier) {
    VerticalStack(
        modifier = modifier,
    ) {
        item {
            Text("Grocery List")
        }
        item {
            ListItem(
                supportingLabel = { Text("1 Gallon") },
                leadingIcon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Item") },
                trailingIcon = { Text("$3.99") },
            ) {
                Text("Milk")
            }
        }
        item {
            ListItem(
                supportingLabel = { Text("1 Dozen") },
                leadingIcon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Item") },
                trailingIcon = { Text("$2.50") },
            ) {
                Text("Eggs")
            }
        }
        item {
            ListItem(
                supportingLabel = { Text("1 Loaf") },
                leadingIcon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Item") },
                trailingIcon = { Text("$4.00") },
            ) {
                Text("Whole Wheat Bread")
            }
        }
    }
}
