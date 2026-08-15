package com.spresso19

import android.content.Intent
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import java.util.UUID

class SpressoLensTileService : TileService() {
    override fun onClick() {
        super.onClick()
        val intent = Intent(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN).apply {
            putExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN, UUID.randomUUID().toString())
            putExtra(AccessibilityServiceCommands.EXTRA_REQUESTED_AT, System.currentTimeMillis())
        }
        sendBroadcast(intent)
        
        // Collapse the notification shade after clicking
        @Suppress("DEPRECATION")
        val it = Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
        sendBroadcast(it)
    }

    override fun onStartListening() {
        super.onStartListening()
        val tile = qsTile
        tile.state = Tile.STATE_ACTIVE
        tile.updateTile()
    }
}
