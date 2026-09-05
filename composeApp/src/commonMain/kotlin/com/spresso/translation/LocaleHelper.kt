package com.spresso.translation

expect class LocaleHelper() {
    fun setLocale(languageTag: String)

    fun getCurrentLocale(): String
}
