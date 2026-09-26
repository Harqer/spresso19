package network

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LiveApiClientProtocolTest {
    @Test
    fun setupContainsOnlyTheSetupEnvelopeAndResumptionHandle() {
        val setup = liveSetupMessage("resume-123")
        assertEquals(setOf("setup"), liveMessageEnvelopes(setup))

        val config = setup.getValue("setup").jsonObject
        assertEquals(LIVE_MODEL, config.getValue("model").jsonPrimitive.content)
        assertEquals(LIVE_ASSISTANT_INSTRUCTION, config.getValue("systemInstruction").jsonObject.getValue("parts").jsonArray.first().jsonObject.getValue("text").jsonPrimitive.content)
        assertTrue("inputAudioTranscription" in config)
        assertTrue("outputAudioTranscription" in config)
        assertTrue("tools" in config)
        assertEquals("resume-123", config.getValue("sessionResumption").jsonObject.getValue("handle").jsonPrimitive.content)
        assertEquals(
            listOf("AUDIO"),
            config.getValue("generationConfig").jsonObject.getValue("responseModalities").jsonArray.map { it.jsonPrimitive.content },
        )
        assertFalse("responseModalities" in config)
    }

    @Test
    fun realtimeInputsUseExactlyOneCanonicalEnvelope() {
        val audio = liveAudioInputMessage("AQID", "audio/pcm;rate=16000")
        val video = liveVideoInputMessage("aW1hZ2U=", "image/jpeg")
        val text = liveTextInputMessage("look at this")

        assertEquals(setOf("realtimeInput"), liveMessageEnvelopes(audio))
        assertEquals(setOf("realtimeInput"), liveMessageEnvelopes(video))
        assertEquals(setOf("realtimeInput"), liveMessageEnvelopes(text))

        val audioJson = Json.parseToJsonElement(encodeLiveMessage(audio)).jsonObject
        assertEquals(setOf("realtimeInput"), liveMessageEnvelopes(audioJson))
        assertEquals("AQID", audioJson.getValue("realtimeInput").jsonObject.getValue("audio").jsonObject.getValue("data").jsonPrimitive.content)
    }

    @Test
    fun tokenIsSafelyEncodedAsAQueryParameter() {
        assertEquals("abc%2B123%2F%3D", encodeLiveTokenQueryParameter("abc+123/="))
        assertEquals("token-._~", encodeLiveTokenQueryParameter("token-._~"))
    }

    @Test
    fun interimInputIsReplacedAndOnlyCompletedTextIsReturned() {
        val transcript = LiveTranscriptAccumulator()
        assertEquals("hello wor", transcript.setInterimInput("hello wor"))
        assertEquals("hello world", transcript.setInterimInput("hello world"))
        assertEquals("hello world", transcript.appendInput("hello world"))
        transcript.appendOutput("Welcome")
        transcript.appendOutput(" back")

        val completed = transcript.completeTurn()
        assertEquals("hello world", completed?.userTranscript)
        assertEquals("Welcome back", completed?.assistantTranscript)
        assertEquals(false, completed?.interrupted)
        assertNull(transcript.completeTurn())
    }

    @Test
    fun interimWordsSurviveFinalPhraseChunkingWithoutDuplicatingTheCommittedPrefix() {
        val transcript = LiveTranscriptAccumulator()
        assertEquals("find red shoes", transcript.setInterimInput("find red shoes"))
        assertEquals("find red shoes", transcript.appendInput("find red shoes"))
        assertEquals("find red shoes near me", transcript.appendInput(" near me"))

        val completed = transcript.completeTurn()
        assertEquals("find red shoes near me", completed?.userTranscript)
        assertNull(transcript.completeTurn())
    }

    @Test
    fun repeatedOrDelayedInputTranscriptionsDoNotDuplicateTheCommittedTurn() {
        val transcript = LiveTranscriptAccumulator()
        assertEquals("Hello there", transcript.appendInput("Hello there"))
        assertEquals("Hello there", transcript.appendInput("Hello there"))
        transcript.appendOutput("Welcome")
        val completed = transcript.completeTurn()

        assertEquals("Hello there", completed?.userTranscript)
        assertEquals("", transcript.appendInput("Hello there"))
        assertNull(transcript.completeTurn())
    }

    @Test
    fun cumulativeFinalTranscriptionMergesWithACommittedPrefix() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("find red")
        assertEquals("find red shoes", transcript.appendInput("find red shoes"))
        transcript.appendOutput("Here are shoes")

        assertEquals("find red shoes", transcript.completeTurn()?.userTranscript)
    }

    @Test
    fun turnCompleteBeforeInputTranscriptionKeepsLateFinalOnCompletedTurn() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendOutput("Here are the results")
        val completedTurn = transcript.completeTurn()

        assertEquals("", completedTurn?.userTranscript)
        assertEquals("Here are the results", completedTurn?.assistantTranscript)
        assertEquals("find a red jacket", transcript.appendInput("find a red jacket"))
        assertNull(transcript.completeTurn())

        transcript.reset()
        transcript.setInterimInput("next request")
        transcript.appendOutput("Response to next request")
        val nextTurn = transcript.completeTurn()
        assertEquals("next request", nextTurn?.userTranscript)
        assertEquals("Response to next request", nextTurn?.assistantTranscript)
    }

    @Test
    fun lateCanceledOutputCannotCompleteAnInterruptedTurnWithoutNewOutput() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("first request")
        transcript.appendOutput("Canceled response")
        transcript.interrupt()
        transcript.appendInput("barge-in request")

        assertNull(transcript.completeTurn())

        transcript.appendOutput("New answer")
        val completed = transcript.completeTurn()
        assertEquals("first request barge-in request", completed?.userTranscript)
        assertEquals("New answer", completed?.assistantTranscript)
    }

    @Test
    fun lateCanceledAssistantTextIsNotReintroducedByModelTextFallback() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("find a red jacket")
        transcript.interrupt()
        transcript.appendModelText("old answer")
        transcript.interrupt()
        transcript.appendModelText("new answer")

        val completed = transcript.completeTurn()
        assertEquals("new answer", completed?.assistantTranscript)
    }

    @Test
    fun liveAssistantOutputTextIsNotDuplicatedAcrossTranscriptionAndModelTurn() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendOutput("Hello there")
        transcript.appendModelText("Hello there")

        assertEquals("Hello there", transcript.completeTurn()?.assistantTranscript)
    }

    @Test
    fun authenticatedLiveSetupAllowsClientResumptionHandleWithinUnlockedField() {
        val setup = liveSetupMessage("resume-123").getValue("setup").jsonObject
        val locked = LIVE_TOKEN_FIELD_MASK.split(",").toSet()

        assertFalse("sessionResumption" in locked)
        assertEquals("resume-123", setup.getValue("sessionResumption").jsonObject.getValue("handle").jsonPrimitive.content)
        assertTrue("generationConfig" in setup)
    }

    @Test
    fun tokenRequestFieldMaskIsSerializedAsTheAuthTokenStringField() {
        val request = liveTokenRequestBody()

        val setup = request.getValue("bidiGenerateContentSetup").jsonObject
        assertEquals(setOf("model", "generationConfig", "inputAudioTranscription", "outputAudioTranscription", "systemInstruction", "tools"), LIVE_TOKEN_FIELD_MASK.split(",").toSet())
        val fields = request.getValue("fieldMask").jsonPrimitive.content.split(",").toSet()
        assertEquals(setOf("model", "generationConfig", "systemInstruction", "tools", "inputAudioTranscription", "outputAudioTranscription"), fields)
        assertEquals(LIVE_MODEL, setup.getValue("model").jsonPrimitive.content)
        assertEquals(LIVE_ASSISTANT_INSTRUCTION, setup.getValue("systemInstruction").jsonObject.getValue("parts").jsonArray.first().jsonObject.getValue("text").jsonPrimitive.content)
    }

    @Test
    fun finalizedTranscriptionMergePreservesOnlyTheSharedPrefix() {
        assertEquals("Sunshine", mergeFinalizedTranscript("Sun", "Sunshine"))
        assertEquals("find red shoes", mergeFinalizedTranscript("find red", "find red shoes"))
        assertEquals("find red shoes near me", mergeFinalizedTranscript("find red shoes", "shoes near me"))
        assertEquals("find red shoes again", mergeFinalizedTranscript("find red shoes", "find red shoes again"))
    }

    @Test
    fun repeatedTurnCompleteDoesNotPersistTheSameTurnTwice() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("hello")
        transcript.appendOutput("Hi")

        assertEquals("hello", transcript.completeTurn()?.userTranscript)
        assertNull(transcript.completeTurn())
    }


    @Test
    fun repeatedBargeInDiscardsEachPriorAssistantGeneration() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("help me cook")
        transcript.appendOutput("Discard this response")
        transcript.interrupt()
        transcript.appendOutput("Discard this one too")
        transcript.interrupt()
        transcript.appendOutput("Use medium heat")

        val completed = transcript.completeTurn()
        assertEquals("Use medium heat", completed?.assistantTranscript)
        assertEquals(true, completed?.interrupted)
    }

    @Test
    fun interruptedInputTranscriptionSurvivesWithTheNewAssistantTurn() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("find a jacket")
        transcript.appendOutput("Old response")
        transcript.interrupt()
        transcript.appendInput("make it waterproof")
        transcript.appendOutput("Here are waterproof options")

        val completed = transcript.completeTurn()
        assertEquals("find a jacket make it waterproof", completed?.userTranscript)
        assertEquals("Here are waterproof options", completed?.assistantTranscript)
    }

    @Test
    fun interruptedAssistantPartialIsDiscardedButTheFinalTurnIsMarkedInterrupted() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("find a jacket")
        transcript.appendOutput("I found three")
        transcript.interrupt()
        transcript.appendOutput(" options for you")

        val completed = transcript.completeTurn()
        assertEquals("find a jacket", completed?.userTranscript)
        assertEquals("options for you", completed?.assistantTranscript)
        assertEquals(true, completed?.interrupted)
        assertNull(transcript.completeTurn())
    }

    @Test
    fun incompleteTurnIsDiscardedWhenTheTransportReconnects() {
        val transcript = LiveTranscriptAccumulator()
        transcript.appendInput("partial user")
        transcript.appendOutput("partial assistant")
        transcript.reset()

        assertNull(transcript.completeTurn())
    }

    @Test
    fun malformedTranscriptionFrameDoesNotCompleteAnOtherwiseEmptyTurn() {
        val legacyOnly =
            ServerMessage(
                bidiStreamOutput = AgentEngineBidiStreamOutput(output = AgentEngineOutput(endOfTurn = true)),
            )
        assertTrue(isLegacyTurnComplete(legacyOnly))
        assertNull(LiveTranscriptAccumulator().completeTurn())
    }

    @Test
    fun legacyEndOfTurnIsIgnoredWhenGeminiLiveServerContentIsPresent() {
        val legacyOnly =
            ServerMessage(
                bidiStreamOutput = AgentEngineBidiStreamOutput(output = AgentEngineOutput(endOfTurn = true)),
            )
        val mixed =
            ServerMessage(
                serverContent = ServerContent(turnComplete = true),
                bidiStreamOutput = AgentEngineBidiStreamOutput(output = AgentEngineOutput(endOfTurn = true)),
            )

        assertTrue(isLegacyTurnComplete(legacyOnly))
        assertFalse(isLegacyTurnComplete(mixed))
    }
}
