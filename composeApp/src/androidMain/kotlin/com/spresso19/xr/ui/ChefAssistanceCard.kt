package com.spresso19.xr.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.xr.glimmer.Card
import androidx.xr.glimmer.Button
import androidx.xr.glimmer.Icon
import androidx.xr.glimmer.Text
import androidx.xr.glimmer.TitleChip

@Composable
fun ChefAssistanceCard(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        TitleChip { Text("Bargain Chef") }
        Spacer(Modifier.height(16.dp))
        
        Card(
            onClick = { /* Handle next step */ },
            title = { Text("Step 1 of 5") },
            leadingIcon = { Icon(Icons.Default.Info, contentDescription = "Info") }
        ) {
            Text("Add 2 tbsp of Extra Virgin Olive Oil to the pan on medium heat. Wait until the oil starts to shimmer before adding the minced garlic.")
        }
    }
}
