package com.spresso

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.xr.glimmer.GlimmerTheme
import kotlinx.coroutines.launch
import network.callFirebaseFunction
import org.json.JSONObject

class SpressoGlimmerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // For Android XR, allow initial focus
        // isInitialFocusOnFocusableAvailable = true

        setContent {
            var isCooking by remember { mutableStateOf(true) }
            var isGenerating by remember { mutableStateOf(false) }
            var instructions by remember { mutableStateOf<List<String>>(emptyList()) }
            val scope = rememberCoroutineScope()

            GlimmerTheme {
                // Must use pure black background for additive display
                Box(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .background(Color.Black),
                ) {
                    com.spresso.xr.ui.SpressoGlimmerApp(
                        isCooking = isCooking,
                        instructions = instructions,
                        isGenerating = isGenerating,
                        onRequestRecipe = {
                            if (isGenerating) return@SpressoGlimmerApp
                            isGenerating = true
                            scope.launch {
                                try {
                                    // Request the current cooking guidance from the backend.
                                    val resultStr =
                                        callFirebaseFunction(
                                            "generateRecipeBargainChef",
                                            "{\"prompt\":\"Give concise cooking instructions for the current ingredients.\",\"ingredients\":[]}",
                                        )
                                    val resultJson = JSONObject(resultStr)
                                    val newInstructions = mutableListOf<String>()
                                    if (resultJson.has("recommendations")) {
                                        val recs = resultJson.getJSONArray("recommendations")
                                        for (i in 0 until recs.length()) {
                                            newInstructions.add(recs.getString(i))
                                        }
                                    } else if (resultJson.has("text")) {
                                        newInstructions.addAll(resultJson.getString("text").split("\n").filter { it.isNotBlank() })
                                    } else {
                                        newInstructions.add("Continue when ready.")
                                    }
                                    instructions = newInstructions
                                } catch (e: Exception) {
                                    instructions = listOf("Error generating recipe. Please check your connection and try again.")
                                } finally {
                                    isGenerating = false
                                }
                            }
                        },
                    )
                }
            }
        }
    }
}
