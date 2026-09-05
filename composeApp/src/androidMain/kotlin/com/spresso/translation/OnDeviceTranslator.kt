package com.spresso.translation

import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.tasks.await

actual class OnDeviceTranslator {
    actual suspend fun translate(
        text: String,
        targetLanguage: String,
    ): String {
        // Simple mapping for target languages
        val mlkitLang =
            TranslateLanguage.fromLanguageTag(targetLanguage)
                ?: TranslateLanguage.ENGLISH

        if (mlkitLang == TranslateLanguage.ENGLISH) {
            return text
        }

        val options =
            TranslatorOptions
                .Builder()
                .setSourceLanguage(TranslateLanguage.ENGLISH)
                .setTargetLanguage(mlkitLang)
                .build()

        val translator = Translation.getClient(options)

        translator.downloadModelIfNeeded().await()
        val translated = translator.translate(text).await()
        translator.close()

        return translated
    }
}
