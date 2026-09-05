package com.spresso

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.UUID

class SpressoLensShortcutReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        if (intent.action != ACTION_SHORTCUT_LENS) {
            return
        }

        context.startActivity(Intent(context, MainActivity::class.java).apply {
            action = MainActivity.ACTION_USER_SCREEN_CAPTURE
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        })
    }

    companion object {
        const val ACTION_SHORTCUT_LENS = "com.spresso.ACTION_SHORTCUT_LENS"
    }
}
