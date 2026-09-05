package com.spresso.translation

expect class OnDeviceTranslator() {
    suspend fun translate(
        text: String,
        targetLanguage: String,
    ): String
}
