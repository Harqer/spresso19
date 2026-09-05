package com.spresso.translation

import kotlinx.browser.window

actual class LocaleHelper {
    private var locale: String = window.navigator.language

    actual fun setLocale(languageTag: String) {
        if (languageTag.isNotBlank()) locale = languageTag
    }

    actual fun getCurrentLocale(): String = locale
}
