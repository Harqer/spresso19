package network

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class LiveApiClientLifecycleTest {
    @Test
    fun tokenLocksServerOwnedConfigurationButAllowsResumptionHandle() {
        val tokenRequest = liveTokenRequestBody()
        val setup = tokenRequest.getValue("bidiGenerateContentSetup").jsonObject
        val fieldMask = tokenRequest.getValue("fieldMask").jsonPrimitive.content.split(",").toSet()

        assertEquals(LIVE_MODEL, setup.getValue("model").jsonPrimitive.content)
        assertEquals(
            setOf("model", "generationConfig", "systemInstruction", "tools", "inputAudioTranscription", "outputAudioTranscription"),
            fieldMask,
        )
        assertFalse("sessionResumption" in fieldMask)
        assertTrue("sessionResumption" in setup)
        assertEquals(
            listOf("AUDIO"),
            setup.getValue("generationConfig").jsonObject.getValue("responseModalities").jsonArray.map { it.jsonPrimitive.content },
        )
        assertEquals(
            LIVE_ASSISTANT_INSTRUCTION,
            setup.getValue("systemInstruction").jsonObject
                .getValue("parts").jsonArray.first().jsonObject.getValue("text").jsonPrimitive.content,
        )
    }

    @Test
    fun setupUsesCurrentModelAndRealtimeTranscriptionConfig() {
        val config = liveSetupMessage("resume-123").getValue("setup").jsonObject

        assertEquals(LIVE_MODEL, config.getValue("model").jsonPrimitive.content)
        assertEquals(
            "resume-123",
            config.getValue("sessionResumption").jsonObject.getValue("handle").jsonPrimitive.content,
        )
        assertTrue("generationConfig" in config)
        assertTrue("inputAudioTranscription" in config)
        assertTrue("outputAudioTranscription" in config)
    }
}
