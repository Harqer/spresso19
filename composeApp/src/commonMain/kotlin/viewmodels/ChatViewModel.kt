package viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import network.ChatMessage
import network.ConnectionState
import network.ConvexApi
import network.LiveApiClient
import network.ProductItem
import network.models.GroundingSource

class ChatViewModel(
    private val apiClient: ConvexApi,
    private val scope: CoroutineScope,
    private val liveApiClient: LiveApiClient = LiveApiClient(),
) {
    /**
     * Invoked on barge-in/turn-complete so the owner can stop already-queued
     * audio playback (the transport cannot reach the player itself).
     */
    var onPlaybackInterrupted: (() -> Unit)? = null
    val messages = mutableStateListOf<ChatMessage>()
    var isGenerating by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var isVoiceActive by mutableStateOf(false)
    var isVoiceSpeaking by mutableStateOf(false)
    var isVoiceListening by mutableStateOf(false)
    var liveTranscript by mutableStateOf("")
    private var threadId: String? = null
    private var requestGeneration = 0L
    private var activeRequestCount = 0

    private fun beginRequest() {
        activeRequestCount += 1
        isGenerating = true
    }

    private fun endRequest(generation: Long) {
        if (generation != requestGeneration) return
        activeRequestCount = (activeRequestCount - 1).coerceAtLeast(0)
        isGenerating = activeRequestCount > 0
    }

    fun sendMessage(prompt: String) {
        // The AI chat is a signed-in-only surface: Firebase owns identity and the
        // Convex thread/message plane keys off it, so an unauthenticated prompt can
        // only fail server-side. Fail fast and visibly instead.
        if (network.getCurrentUserUid() == null) {
            errorMessage = "Sign in to chat with your Spresso AI shopper."
            return
        }
        if (prompt.isBlank()) return
        val userMsgId = "u-" + messages.size
        messages.add(ChatMessage(id = userMsgId, text = prompt, isUser = true))
        sendMessageInternal(prompt, "ai-${messages.size}")
    }

    private fun sendMessageInternal(
        prompt: String,
        aiMsgId: String,
    ) {
        val generation = requestGeneration
        beginRequest()
        scope.launch {
            try {
                errorMessage = null
                val activeThreadId = threadId ?: apiClient.createChatThread("Spresso discovery").also { threadId = it }
                if (generation != requestGeneration) return@launch

                // Capture the existing assistant set before submitting this prompt.
                // Without this baseline, a fast poll can display the previous answer
                // as the answer to the new request.
                val existingAssistantIds =
                    apiClient
                        .listChatMessages(activeThreadId)
                        .filter { it.role == "assistant" }
                        .mapTo(mutableSetOf()) { it.id }
                apiClient.sendChatMessage(activeThreadId, prompt)

                var lastAssistantText = ""
                for (attempt in 0 until 120) {
                    if (generation != requestGeneration) return@launch
                    val history = apiClient.listChatMessages(activeThreadId)
                    val assistant =
                        history.lastOrNull {
                            it.role == "assistant" && it.id !in existingAssistantIds
                        }
                    if (assistant != null && (assistant.text != lastAssistantText || assistant.products.isNotEmpty())) {
                        lastAssistantText = assistant.text
                        updateOrAddAiMessage(
                            aiMsgId,
                            assistant.text,
                            products = assistant.products,
                            isStreaming = assistant.status == "streaming",
                        )
                    }
                    if (assistant?.status != "streaming" && !assistant?.text.isNullOrBlank()) break
                    if (attempt < 119) delay(500)
                }
                if (generation != requestGeneration) return@launch
                if (lastAssistantText.isBlank()) {
                    throw IllegalStateException("The assistant did not return a response.")
                }
                updateOrAddAiMessage(aiMsgId, lastAssistantText, isStreaming = false)
            } catch (error: Exception) {
                if (generation == requestGeneration) {
                    errorMessage = error.message ?: "The assistant is temporarily unavailable."
                    updateOrAddAiMessage(aiMsgId, "I couldn't complete that request. Please try again.", isStreaming = false)
                }
            } finally {
                endRequest(generation)
            }
        }
    }

    fun sendCameraSnapshot(
        imageBase64: String,
        prompt: String? = null,
    ) {
        if (network.getCurrentUserUid() == null) {
            errorMessage = "Sign in to use Lens and visual search."
            return
        }
        val userPrompt = prompt ?: "Identify items in camera image and find matches."
        val userMsgId = "u-cam-" + messages.size
        messages.add(ChatMessage(id = userMsgId, text = userPrompt, isUser = true))

        val aiMsgId = "ai-lens-" + messages.size
        errorMessage = null

        val generation = requestGeneration
        beginRequest()
        scope.launch {
            try {
                val lensResponse = apiClient.performLensSearch(imageBase64)
                if (generation != requestGeneration) return@launch
                if (lensResponse.success && lensResponse.listings.isNotEmpty()) {
                    val products =
                        lensResponse.listings.map { listing ->
                            ProductItem(
                                id = listing.id,
                                name = listing.name,
                                brand = listing.brand.orEmpty(),
                                category = listing.category.orEmpty(),
                                price = listing.observedPrice?.amount,
                                imageUrl = listing.imageUrl.orEmpty(),
                                rating = listing.rating,
                                description = listing.reviewSummary,
                                merchantUrl = listing.merchantUrl,
                                source = listing.source,
                                providerListingId = listing.providerListingId,
                            )
                        }

                    val annotText = "Found ${products.size} visual matches."
                    updateOrAddAiMessage(
                        id = aiMsgId,
                        text = annotText,
                        products = products,
                    )
                    endRequest(generation)
                } else {
                    endRequest(generation)
                    sendMessageInternal(userPrompt, aiMsgId)
                }
            } catch (e: Exception) {
                if (requestGeneration == generation) {
                    endRequest(generation)
                    errorMessage = e.message
                    sendMessageInternal(userPrompt, aiMsgId)
                }
            }
        }
    }

    fun toggleVoiceStream() {
        if (isVoiceActive) {
            stopVoiceStream()
        } else {
            startVoiceStream()
        }
    }

    fun startVoiceStream(
        onReceiveAudio: ((ByteArray) -> Unit)? = null,
        onPlaybackInterrupted: (() -> Unit)? = null,
    ) {
        if (network.getCurrentUserUid() == null) {
            errorMessage = "Sign in to talk to your Spresso AI shopper."
            return
        }
        isVoiceActive = true
        isVoiceListening = true
        isVoiceSpeaking = false
        errorMessage = null

        val voiceMsgId = "voice-live-" + messages.size
        var accumulatedText = ""

        scope.launch {
            try {
                liveApiClient.connect(
                    onReceiveAudio = { pcmBytes ->
                        isVoiceSpeaking = true
                        isVoiceListening = false
                        onReceiveAudio?.invoke(pcmBytes)
                    },
                    onReceiveText = { textChunk ->
                        accumulatedText += textChunk
                        liveTranscript = accumulatedText
                        updateOrAddAiMessage(voiceMsgId, accumulatedText)
                    },
                    onInterrupted = {
                        // Barge-in: stop queued playback immediately, then flip state.
                        onPlaybackInterrupted?.invoke()
                        isVoiceSpeaking = false
                        isVoiceListening = true
                    },
                    onTurnComplete = {
                        // Turn boundary without interruption: same playback reset.
                        onPlaybackInterrupted?.invoke()
                        isVoiceSpeaking = false
                        isVoiceListening = true
                    },
                    onStateChanged = { state ->
                        if (state == ConnectionState.RECONNECTING || state == ConnectionState.CONNECTED) {
                            // A fresh session must not append onto a dead session's
                            // partial transcript — the old response is unrecoverable.
                            accumulatedText = ""
                            liveTranscript = ""
                            updateOrAddAiMessage(voiceMsgId, "", isStreaming = state == ConnectionState.CONNECTED)
                        }
                        if (state == ConnectionState.ERROR) {
                            isVoiceListening = false
                            isVoiceSpeaking = false
                        }
                    },
                )
            } catch (e: Exception) {
                isVoiceActive = false
                isVoiceListening = false
                isVoiceSpeaking = false
                errorMessage = e.message ?: "Voice stream connection error."
            }
        }
    }

    fun stopVoiceStream() {
        liveApiClient.close()
        isVoiceActive = false
        isVoiceListening = false
        isVoiceSpeaking = false
    }

    fun sendVoiceChunk(base64Audio: String) {
        if (isVoiceActive) {
            scope.launch {
                try {
                    liveApiClient.sendAudioChunk(base64Audio)
                } catch (e: Exception) {
                    println("ChatViewModel sendVoiceChunk error: ${e.message}")
                }
            }
        }
    }

    fun sendLiveVideoFrame(base64Image: String) {
        if (isVoiceActive) {
            scope.launch {
                try {
                    liveApiClient.sendVideoFrame(base64Image)
                } catch (e: Exception) {
                    println("ChatViewModel sendLiveVideoFrame error: ${e.message}")
                }
            }
        }
    }

    fun sendLiveVisionContext(context: String) {
        if (isVoiceActive) {
            scope.launch {
                try {
                    liveApiClient.sendTextContent("Nearby visual context: $context")
                } catch (e: Exception) {
                    println("ChatViewModel sendLiveVisionContext error: ${e.message}")
                }
            }
        }
    }

    private fun updateOrAddAiMessage(
        id: String,
        text: String,
        thought: String? = null,
        mediaUrl: String? = null,
        mediaType: String? = null,
        sources: List<GroundingSource> = emptyList(),
        products: List<ProductItem> = emptyList(),
        isStreaming: Boolean = isGenerating,
    ) {
        val index = messages.indexOfFirst { it.id == id }
        val previous = messages.getOrNull(index)
        val newMessage =
            ChatMessage(
                id = id,
                text = text,
                isUser = false,
                thought = thought,
                mediaUrl = mediaUrl ?: previous?.mediaUrl,
                mediaType = mediaType ?: previous?.mediaType,
                sources = sources,
                products = products,
                isStreaming = isStreaming,
            )
        if (index != -1) {
            messages[index] = newMessage
        } else {
            messages.add(newMessage)
        }
    }

    fun clearSession() {
        stopVoiceStream()
        requestGeneration += 1
        activeRequestCount = 0
        messages.clear()
        threadId = null
        errorMessage = null
        isGenerating = false
    }
}
