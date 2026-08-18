package com.spresso19

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import java.util.UUID

class SpressoLensGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            GlanceContent()
        }
    }

    @Composable
    private fun GlanceContent() {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(8.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    text = "Spresso Lens",
                    onClick = actionRunCallback<TriggerLensActionCallback>()
                )
            }
        }
    }
}

class TriggerLensActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val intent = Intent(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN).apply {
            setPackage(context.packageName)
            putExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN, UUID.randomUUID().toString())
            putExtra(AccessibilityServiceCommands.EXTRA_REQUESTED_AT, System.currentTimeMillis())
        }
        context.sendBroadcast(intent)
    }
}
