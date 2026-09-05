package com.spresso

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class SpressoLensTileService : TileService() {
    override fun onClick() {
        super.onClick()
        val intent =
            Intent(this, MainActivity::class.java).apply {
                action = MainActivity.ACTION_USER_SCREEN_CAPTURE
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
        val pendingIntent =
            PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(pendingIntent)
        } else {
            @Suppress("StartActivityAndCollapseDeprecated")
            startActivityAndCollapse(intent)
        }

        // In Android 12+, closing system dialogs requires signature permissions.
        // We will just let the system handle the panel state.
    }

    override fun onStartListening() {
        super.onStartListening()
        val tile = qsTile
        tile.state = Tile.STATE_ACTIVE
        tile.updateTile()
    }
}
