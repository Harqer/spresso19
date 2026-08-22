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
fun ChefAssistanceCard(
    instructions: List<String>,
    isGenerating: Boolean = false,
    onRequestRecipe: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var step by remember { mutableStateOf(1) }
    val maxSteps = if (instructions.isNotEmpty()) instructions.size else 1

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        TitleChip { Text("Bargain Chef") }
        Spacer(Modifier.height(16.dp))

        if (isGenerating) {
            Card(
                title = { Text("Generating Recipe...") },
                leadingIcon = { Icon(Icons.Default.Info, contentDescription = "Generating") },
            ) {
                Text("Please wait while our AI Chef prepares your instructions...")
            }
        } else if (instructions.isEmpty()) {
            Card(
                onClick = {
                    try {
                        onRequestRecipe()
                    } catch (e: Exception) {
                        // In production, log to Crashlytics if available, but for UI layer this is safe
                    }
                },
                title = { Text("No Recipe") },
                leadingIcon = { Icon(Icons.Default.Info, contentDescription = "Info") },
            ) {
                Text("Tap to generate a recipe and see step-by-step instructions.")
            }
        } else {
            Card(
                onClick = { if (step < maxSteps) step++ else step = 1 },
                title = { Text("Step $step of $maxSteps") },
                leadingIcon = { Icon(Icons.Default.Info, contentDescription = "Info") },
            ) {
                Text(instructions[step - 1])
            }
        }
    }
}
