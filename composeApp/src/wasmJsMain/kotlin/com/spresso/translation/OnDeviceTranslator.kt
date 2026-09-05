package com.spresso.translation

/** Browser builds do not claim on-device translation until a real provider is wired. */
actual class OnDeviceTranslator {
    actual suspend fun translate(text: String, targetLanguage: String): String = text
}
