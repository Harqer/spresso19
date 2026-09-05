package com.spresso.translation

import platform.Foundation.NSLocale
import platform.Foundation.currentLocale
import platform.Foundation.languageCode

actual class LocaleHelper {
    actual fun setLocale(languageTag: String) {
        // In iOS, per-app language settings are managed in the Settings app natively.
        // We can't programmatically override it easily without swizzling NSBundle,
        // so for now this is a no-op or requires a restart approach.
    }

    actual fun getCurrentLocale(): String = NSLocale.currentLocale.languageCode ?: "en"
}
