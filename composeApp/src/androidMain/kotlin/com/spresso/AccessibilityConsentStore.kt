package com.spresso

import android.content.Context

/**
 * Stores only the user's current accessibility disclosure decision.
 * Screen captures are never written to this store.
 */
internal class AccessibilityConsentStore(
    context: Context,
) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun hasCurrentConsent(): Boolean =
        preferences.getBoolean(CONSENT_GRANTED_KEY, false) &&
            preferences.getInt(CONSENT_VERSION_KEY, 0) == CURRENT_CONSENT_VERSION

    fun grantCurrentConsent() {
        preferences
            .edit()
            .putBoolean(CONSENT_GRANTED_KEY, true)
            .putInt(CONSENT_VERSION_KEY, CURRENT_CONSENT_VERSION)
            .putLong(CONSENT_ACCEPTED_AT_KEY, System.currentTimeMillis())
            .apply()
    }

    fun revokeConsent() {
        preferences
            .edit()
            .putBoolean(CONSENT_GRANTED_KEY, false)
            .remove(CONSENT_ACCEPTED_AT_KEY)
            .apply()
    }

    companion object {
        const val CURRENT_CONSENT_VERSION = 1
        private const val PREFERENCES_NAME = "accessibility_screen_search_consent"
        private const val CONSENT_GRANTED_KEY = "consent_granted"
        private const val CONSENT_VERSION_KEY = "consent_version"
        private const val CONSENT_ACCEPTED_AT_KEY = "consent_accepted_at"
    }
}
