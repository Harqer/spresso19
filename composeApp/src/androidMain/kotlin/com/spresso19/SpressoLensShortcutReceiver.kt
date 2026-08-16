package com.spresso19

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.UUID

class SpressoLensShortcutReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val scanIntent = Intent(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN).apply {
            setPackage(context.packageName)
            putExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN, UUID.randomUUID().toString())
            putExtra(AccessibilityServiceCommands.EXTRA_REQUESTED_AT, System.currentTimeMillis())
        }
        context.sendBroadcast(scanIntent)
    }
}
