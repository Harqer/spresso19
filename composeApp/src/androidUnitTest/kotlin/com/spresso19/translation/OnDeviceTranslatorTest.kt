package com.spresso19.translation

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class OnDeviceTranslatorTest {

    @Test
    fun `translates text successfully when model is downloaded`() = runBlocking {
        val translator = OnDeviceTranslator()
        val result = translator.translate("Hello world", targetLanguage = "es")
        assertEquals("Hola mundo", result)
    }
}
