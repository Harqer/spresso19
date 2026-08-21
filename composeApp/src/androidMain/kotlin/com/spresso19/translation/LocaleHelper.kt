package com.spresso19.translation

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import java.util.Locale

actual class LocaleHelper {
    actual fun setLocale(languageTag: String) {
        val localeList = LocaleListCompat.forLanguageTags(languageTag)
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    actual fun getCurrentLocale(): String {
        val locales = AppCompatDelegate.getApplicationLocales()
        return if (!locales.isEmpty) {
            locales.get(0)?.toLanguageTag() ?: Locale.getDefault().toLanguageTag()
        } else {
            Locale.getDefault().toLanguageTag()
        }
    }
}
