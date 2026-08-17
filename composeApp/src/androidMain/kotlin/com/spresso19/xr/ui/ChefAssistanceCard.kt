package com.spresso19.xr.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.xr.glimmer.Card
import androidx.xr.glimmer.Icon
import androidx.xr.glimmer.Text
import androidx.xr.glimmer.TitleChip

@Composable
fun ChefAssistanceCard(modifier: Modifier = Modifier) {
    var step by remember { mutableStateOf(1) }
    val maxSteps = 5
    val instructions = listOf(
        "Add 2 tbsp of Extra Virgin Olive Oil to the pan on medium heat. Wait until the oil starts to shimmer before adding the minced garlic.",
        "Add 3 cloves of minced garlic and sauté until fragrant (about 1 minute).",
        "Add 1 diced onion and cook until translucent (about 5 minutes).",
        "Pour in 1 cup of arborio rice and toast for 2 minutes, stirring constantly.",
        "Gradually add 4 cups of warm vegetable broth, 1/2 cup at a time, waiting until liquid is absorbed."
    )

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        TitleChip { Text("Bargain Chef") }
        Spacer(Modifier.height(16.dp))
        
        Card(
            onClick = { if (step < maxSteps) step++ else step = 1 },
            title = { Text("Step $step of $maxSteps") },
            leadingIcon = { Icon(Icons.Default.Info, contentDescription = "Info") }
        ) {
            Text(instructions[step - 1])
        }
    }
}
