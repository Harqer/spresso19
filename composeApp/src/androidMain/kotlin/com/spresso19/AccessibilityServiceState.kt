package com.spresso19

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.text.TextUtils

internal object AccessibilityServiceState {
    fun isExactServiceEnabled(context: Context): Boolean {
        val expectedComponent = ComponentName(context, SpressoAccessibilityService::class.java)
        val enabledServices =
            Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            ) ?: return false

        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            val enabledComponent = ComponentName.unflattenFromString(splitter.next())
            if (enabledComponent == expectedComponent) {
                return true
            }
        }
        return false
    }
}
