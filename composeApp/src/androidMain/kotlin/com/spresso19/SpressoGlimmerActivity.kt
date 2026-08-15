package com.spresso19

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.xr.glimmer.GlimmerTheme

class SpressoGlimmerActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // For Android XR, allow initial focus
        // isInitialFocusOnFocusableAvailable = true

        setContent {
            GlimmerTheme {
                // Must use pure black background for additive display
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black)
                ) {
                    // We will inject the UI later
                    com.spresso19.xr.ui.SpressoGlimmerApp(isCooking = false) // Default state
                }
            }
        }
    }
}
