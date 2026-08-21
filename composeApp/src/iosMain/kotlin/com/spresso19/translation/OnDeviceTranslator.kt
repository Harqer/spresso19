package com.spresso19.translation

actual class OnDeviceTranslator {
    actual suspend fun translate(text: String, targetLanguage: String): String {
        // For iOS, ML Kit translation requires the iOS SDK Pods. 
        // Until that is added to the Kotlin Multiplatform build, we return the original text.
        return text
    }
}
