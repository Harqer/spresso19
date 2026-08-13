package com.spresso19

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import network.ApiClient
import network.ConnectionState
import network.DetectedItem
import network.DetectedResult
import network.LensSearchResponse
import network.LiveApiClient
import network.ProductItem
import network.models.ChatStreamChunk
import viewmodels.ChatViewModel
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class MultimodalOrchestrationTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    @BeforeTest
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterTest
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // Fake ApiClient to mock REST and streaming chat endpoints
    class FakeApiClient : ApiClient() {
        var lastPrompt: String? = null
        var lastImageBase64: String? = null
        var chunksToEmit: List<ChatStreamChunk> = emptyList()
        var lensResponseToReturn: LensSearchResponse = LensSearchResponse(success = false)
        var lastLensImageBase64: String? = null

        override fun streamChat(
            prompt: String,
            imageBase64: String?,
            location: String?,
            latLng: Pair<Double, Double>?,
            agentType: String?
        ): Flow<ChatStreamChunk> = flow {
            lastPrompt = prompt
            lastImageBase64 = imageBase64
            for (chunk in chunksToEmit) {
                emit(chunk)
            }
        }

        override suspend fun performLensSearch(base64Image: String): LensSearchResponse {
            lastLensImageBase64 = base64Image
            return lensResponseToReturn
        }
    }

    // Fake LiveApiClient to mock WebSocket live voice/audio interaction
    class FakeLiveApiClient : LiveApiClient() {
        var isConnectCalled = false
        var isCloseCalled = false
        var lastSentAudioChunk: String? = null

        var onReceiveAudioCallback: ((ByteArray) -> Unit)? = null
        var onReceiveTextCallback: ((String) -> Unit)? = null
        var onInterruptedCallback: (() -> Unit)? = null

        override suspend fun connect(
            onReceiveAudio: (ByteArray) -> Unit,
            onReceiveText: (String) -> Unit,
            onInterrupted: () -> Unit,
            onStateChanged: (ConnectionState) -> Unit,
            onError: (String) -> Unit
        ) {
            isConnectCalled = true
            onReceiveAudioCallback = onReceiveAudio
            onReceiveTextCallback = onReceiveText
            onInterruptedCallback = onInterrupted
        }

        override suspend fun sendAudioChunk(base64Audio: String, mimeType: String) {
            lastSentAudioChunk = base64Audio
        }

        override fun close() {
            isCloseCalled = true
        }
    }

    @Test
    fun testPromptSubmissionPopulatesUserMessageAndTriggersStreamingState() = runTest {
        val fakeApiClient = FakeApiClient().apply {
            chunksToEmit = listOf(
                ChatStreamChunk(type = "text", text = "Hello! How can I assist your shopping today?"),
                ChatStreamChunk(type = "done")
            )
        }
        val fakeLiveApiClient = FakeLiveApiClient()
        val viewModel = ChatViewModel(fakeApiClient, this, fakeLiveApiClient)

        assertEquals(0, viewModel.messages.size)
        assertFalse(viewModel.isGenerating)

        viewModel.sendMessage("Looking for a stylish jacket")
        testScheduler.advanceUntilIdle()

        // User message and AI message should be created
        assertEquals(2, viewModel.messages.size)

        val userMessage = viewModel.messages[0]
        assertTrue(userMessage.isUser)
        assertEquals("Looking for a stylish jacket", userMessage.text)

        val aiMessage = viewModel.messages[1]
        assertFalse(aiMessage.isUser)
        assertEquals("Hello! How can I assist your shopping today?", aiMessage.text)

        assertEquals("Looking for a stylish jacket", fakeApiClient.lastPrompt)
        assertFalse(viewModel.isGenerating)
    }

    @Test
    fun testCameraImageAttachmentAttachesBase64PayloadToActiveMessageFlow() = runTest {
        val fakeApiClient = FakeApiClient().apply {
            chunksToEmit = listOf(
                ChatStreamChunk(type = "text", text = "I identified the denim jacket in your photo."),
                ChatStreamChunk(type = "done")
            )
            lensResponseToReturn = LensSearchResponse(
                success = true,
                detectedResult = DetectedResult(
                    detectedItems = listOf(
                        DetectedItem(
                            detectedName = "Vintage Denim Jacket",
                            brandGuess = "Spresso Collection",
                            category = "Apparel",
                            priceEstimate = 89.99,
                            confidenceScore = 0.98
                        )
                    ),
                    hudAnnotationText = "Found 1 visual match via Spresso Lens Search."
                )
            )
        }
        val fakeLiveApiClient = FakeLiveApiClient()
        val viewModel = ChatViewModel(fakeApiClient, this, fakeLiveApiClient)

        val base64ImagePayload = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        // Test direct sendMessage with imageBase64 payload
        viewModel.sendMessage("What is this item?", imageBase64 = base64ImagePayload)
        testScheduler.advanceUntilIdle()

        assertEquals(base64ImagePayload, fakeApiClient.lastImageBase64)
        assertEquals("What is this item?", viewModel.messages[0].text)

        // Test sendCameraSnapshot Lens visual search workflow
        val snapshotPayload = "data:image/jpeg;base64,snapshotImageData123"
        viewModel.sendCameraSnapshot(snapshotPayload, prompt = "Find similar products")
        testScheduler.advanceUntilIdle()

        assertEquals(snapshotPayload, fakeApiClient.lastLensImageBase64)
        val lensAiMessage = viewModel.messages.last()
        assertFalse(lensAiMessage.isUser)
        assertEquals("Found 1 visual match via Spresso Lens Search.", lensAiMessage.text)
        assertEquals(1, lensAiMessage.products.size)
        assertEquals("Vintage Denim Jacket", lensAiMessage.products[0].name)
    }

    @Test
    fun testVoiceMicToggleSetsActiveListeningStateAndHandlesAudioStreamingCallbacks() = runTest {
        val fakeApiClient = FakeApiClient()
        val fakeLiveApiClient = FakeLiveApiClient()
        val viewModel = ChatViewModel(fakeApiClient, this, fakeLiveApiClient)

        assertFalse(viewModel.isVoiceActive)
        assertFalse(viewModel.isVoiceListening)
        assertFalse(viewModel.isVoiceSpeaking)

        // Toggle voice stream ON -> should set active listening state
        viewModel.toggleVoiceStream()
        testScheduler.advanceUntilIdle()

        assertTrue(viewModel.isVoiceActive)
        assertTrue(viewModel.isVoiceListening)
        assertFalse(viewModel.isVoiceSpeaking)
        assertTrue(fakeLiveApiClient.isConnectCalled)

        // Trigger audio callback from Live API client -> sets speaking state
        fakeLiveApiClient.onReceiveAudioCallback?.invoke(byteArrayOf(0, 1, 2, 3))
        assertTrue(viewModel.isVoiceSpeaking)
        assertFalse(viewModel.isVoiceListening)

        // Trigger text callback -> populates AI chat message
        fakeLiveApiClient.onReceiveTextCallback?.invoke("I am listening to your voice input.")
        val voiceMsg = viewModel.messages.lastOrNull()
        assertNotNull(voiceMsg)
        assertFalse(voiceMsg.isUser)
        assertEquals("I am listening to your voice input.", voiceMsg.text)

        // Test sending voice chunk audio stream
        viewModel.sendVoiceChunk("pcmAudioDataChunkBase64")
        testScheduler.advanceUntilIdle()
        assertEquals("pcmAudioDataChunkBase64", fakeLiveApiClient.lastSentAudioChunk)

        // Toggle voice stream OFF -> resets listening and speaking state
        viewModel.toggleVoiceStream()
        testScheduler.advanceUntilIdle()

        assertFalse(viewModel.isVoiceActive)
        assertFalse(viewModel.isVoiceListening)
        assertFalse(viewModel.isVoiceSpeaking)
        assertTrue(fakeLiveApiClient.isCloseCalled)
    }

    @Test
    fun testProductRecommendationMappingFromChatChunksToProductCardsWithStarRatings() = runTest {
        val expectedProduct = ProductItem(
            id = "prod-99",
            name = "Organic Silk Blazer",
            brand = "Spresso Luxe",
            category = "Apparel",
            price = 199.99,
            imageUrl = "https://spresso.store/images/silk-blazer.jpg",
            rating = 4.8
        )

        val fakeApiClient = FakeApiClient().apply {
            chunksToEmit = listOf(
                ChatStreamChunk(type = "text", text = "Here are the top recommendations for you:"),
                ChatStreamChunk(
                    type = "recommended_products",
                    recommendedProducts = listOf(expectedProduct)
                ),
                ChatStreamChunk(type = "done")
            )
        }
        val fakeLiveApiClient = FakeLiveApiClient()
        val viewModel = ChatViewModel(fakeApiClient, this, fakeLiveApiClient)

        viewModel.sendMessage("Show me premium blazers")
        testScheduler.advanceUntilIdle()

        val aiMsg = viewModel.messages.last()
        assertFalse(aiMsg.isUser)
        assertEquals("Here are the top recommendations for you:", aiMsg.text)
        assertEquals(1, aiMsg.products.size)

        val mappedProduct = aiMsg.products[0]
        assertEquals("prod-99", mappedProduct.id)
        assertEquals("Organic Silk Blazer", mappedProduct.name)
        assertEquals("Spresso Luxe", mappedProduct.brand)
        assertEquals(199.99, mappedProduct.price)
        assertEquals(4.8, mappedProduct.rating, "Product recommendation card must have standard star rating 4.8")
    }
}
