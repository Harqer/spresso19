package com.spresso19.translation

expect class LocaleHelper() {
    fun setLocale(languageTag: String)

    fun getCurrentLocale(): String
}
