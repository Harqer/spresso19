package network

import com.google.firebase.crashlytics.FirebaseCrashlytics

actual fun logCrashlyticsBreadcrumb(action: String, data: String) {
    try {
        val crashlytics = FirebaseCrashlytics.getInstance()
        crashlytics.setCustomKey("last_action", action)
        crashlytics.log("Action: $action, Data: $data")
    } catch (e: Exception) {
        // Safe fallback if Firebase is not fully initialized
    }
}
