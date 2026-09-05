package com.spresso

import android.content.Context
import androidx.compose.runtime.staticCompositionLocalOf

class ConsentManager(context: Context) {
    private val prefs = context.getSharedPreferences("spresso_consent_prefs", Context.MODE_PRIVATE)

    fun hasAnalyticsConsent(): Boolean {
        return prefs.getBoolean("has_analytics_consent", false)
    }

    fun grantAnalyticsConsent() {
        prefs.edit().putBoolean("has_analytics_consent", true).apply()
    }

    fun hasCameraConsent(): Boolean {
        return prefs.getBoolean("has_camera_consent", false)
    }

    fun grantCameraConsent() {
        prefs.edit().putBoolean("has_camera_consent", true).apply()
    }
    
    fun revokeAllConsent() {
        prefs.edit().clear().apply()
    }
}

val LocalConsentManager = staticCompositionLocalOf<ConsentManager> {
    error("No ConsentManager provided")
}
