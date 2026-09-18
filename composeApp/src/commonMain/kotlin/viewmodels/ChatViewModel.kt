package viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import network.ApiClient
import network.ChatMessage
import network.LiveApiClient
import network.ProductItem
import network.models.GroundingSource

class ChatViewModel(
    private val apiClient: ApiClient,
    private val scope: CoroutineScope,
    private val liveApiClient: LiveApiClient = LiveApiClient(),
    private val generativeAiService: network.GenerativeAiService? = null,
) {
    val messages = mutableStateListOf<ChatMessage>()
    var isGenerating by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var isVoiceActive by mutableStateOf(false)
    var isVoiceSpeaking by mutableStateOf(false)
    var isVoiceListening by mutableStateOf(false)
    var liveTranscript by mutableStateOf("")
    private var threadId: String? = null

    fun sendMessage(prompt: String) {
        if (prompt.isBlank()) return
        val userMsgId = "u-" + messages.size
        messages.add(ChatMessage(id = userMsgId, text = prompt, isUser = true))
        val aiMsgId = "ai-" + messages.size

        scope.launch {
            try {
                errorMessage = null
                isGenerating = true
                val activeThreadId = threadId ?: apiClient.createChatThread("Spresso discovery").also { threadId = it }
                apiClient.sendChatMessage(activeThreadId, prompt)

                var lastAssistantText = ""
                for (attempt in 0 until 120) {
                    val history = apiClient.listChatMessages(activeThreadId)
                    val assistant = history.lastOrNull { it.role == "assistant" }
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
                if (lastAssistantText.isBlank()) {
                    throw IllegalStateException("The assistant did not return a response.")
                }
                updateOrAddAiMessage(aiMsgId, lastAssistantText, isStreaming = false)
            } catch (error: Exception) {
                errorMessage = error.message ?: "The assistant is temporarily unavailable."
                updateOrAddAiMessage(aiMsgId, "I couldn't complete that request. Please try again.", isStreaming = false)
            } finally {
                isGenerating = false
            }
        }
    }

    fun sendCameraSnapshot(
        imageBase64: String,
        prompt: String? = null,
    ) {
        val userPrompt = prompt ?: "Identify items in camera image and find matches."
        val userMsgId = "u-cam-" + messages.size
        messages.add(ChatMessage(id = userMsgId, text = userPrompt, isUser = true))

        val aiMsgId = "ai-lens-" + messages.size
        isGenerating = true
        errorMessage = null

        scope.launch {
            try {
                val lensResponse = apiClient.performLensSearch(imageBase64)
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
                    isGenerating = false
                } else {
                    sendMessage(userPrompt)
                }
            } catch (e: Exception) {
                isGenerating = false
                errorMessage = e.message
                sendMessage(userPrompt)
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

    fun startVoiceStream(onReceiveAudio: ((ByteArray) -> Unit)? = null) {
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
                        isVoiceSpeaking = false
                        isVoiceListening = true
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

    fun sendStandardAudio(
        audioBytes: ByteArray,
        prompt: String = "Please analyze this audio.",
    ) {
        if (generativeAiService != null) {
            val userMsgId = "u-audio-" + messages.size
            messages.add(ChatMessage(id = userMsgId, text = "🔊 [Audio Message Sent]", isUser = true))
            val aiMsgId = "ai-audio-" + messages.size
            isGenerating = true
            errorMessage = null

            scope.launch {
                try {
                    val aiResponse = generativeAiService.generateResponseFromAudio(prompt, audioBytes)
                    updateOrAddAiMessage(aiMsgId, aiResponse)
                } catch (e: Exception) {
                    errorMessage = e.message
                    updateOrAddAiMessage(aiMsgId, "Failed to process audio: ${e.message}")
                } finally {
                    isGenerating = false
                }
            }
        } else {
            errorMessage = "Generative AI Service is not available."
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
        messages.clear()
        threadId = null
        errorMessage = null
        isGenerating = false
    }
}
