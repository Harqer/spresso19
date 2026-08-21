package com.spresso19.translation

expect class OnDeviceTranslator() {
    suspend fun translate(text: String, targetLanguage: String): String
}
