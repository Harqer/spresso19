package com.spresso19.xr.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.xr.glimmer.GlimmerTheme

@Composable
fun SpressoGlimmerApp(isCooking: Boolean) {
    GlimmerTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black), // Black background for additive display
            contentAlignment = Alignment.BottomCenter // Bottom-aligned UI
        ) {
            if (isCooking) {
                ChefAssistanceCard(instructions = emptyList())
            } else {
                GroceryListStack()
            }
        }
    }
}
