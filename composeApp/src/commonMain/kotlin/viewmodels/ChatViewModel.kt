package viewmodels

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.launch
import network.ApiClient
import network.ChatMessage
import network.LiveApiClient
import network.ProductItem
import network.models.GroundingSource

class ChatViewModel(
    private val apiClient: ApiClient,
    private val scope: CoroutineScope,
    private val liveApiClient: LiveApiClient = LiveApiClient()
) {
    val messages = mutableStateListOf<ChatMessage>()
    var isGenerating by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var isVoiceActive by mutableStateOf(false)
    var isVoiceSpeaking by mutableStateOf(false)
    var isVoiceListening by mutableStateOf(false)

    fun sendMessage(
        prompt: String,
        imageBase64: String? = null,
        location: String? = null,
        latLng: Pair<Double, Double>? = null,
        agentType: String? = "SHOPPING_CONCIERGE"
    ) {
        val userMsgId = "u-" + messages.size
        messages.add(ChatMessage(id = userMsgId, text = prompt, isUser = true))
        
        val aiMsgId = "ai-" + messages.size
        var aiText = ""
        var aiThought = ""
        val currentSources = mutableListOf<GroundingSource>()
        val currentProducts = mutableListOf<ProductItem>()
        
        scope.launch {
            errorMessage = null
            apiClient.streamChat(
                prompt = prompt,
                imageBase64 = imageBase64,
                location = location,
                latLng = latLng,
                agentType = agentType
            )
                .onStart { isGenerating = true }
                .onCompletion { isGenerating = false }
                .catch { e ->
                    isGenerating = false
                    val errorText = e.message ?: "Unable to complete request. Please verify connection and retry."
                    updateOrAddAiMessage(
                        id = aiMsgId,
                        text = if (aiText.isNotBlank()) aiText else "Unable to fetch live recommendations: $errorText",
                        thought = null,
                        sources = currentSources,
                        products = currentProducts
                    )
                }
                .collect { chunk ->
                    when (chunk.type) {
                        "text", "text_delta" -> {
                            aiText += chunk.text ?: ""
                            updateOrAddAiMessage(aiMsgId, aiText, aiThought, sources = currentSources, products = currentProducts)
                        }
                        "thought", "thought_delta" -> {
                            aiThought += chunk.text ?: ""
                            updateOrAddAiMessage(aiMsgId, aiText, aiThought, sources = currentSources, products = currentProducts)
                        }
                        "grounding_sources" -> {
                            chunk.sources?.let { currentSources.addAll(it) }
                            updateOrAddAiMessage(aiMsgId, aiText, aiThought, sources = currentSources, products = currentProducts)
                        }
                        "recommended_products", "products" -> {
                            val prods = chunk.recommendedProducts ?: chunk.products
                            prods?.let { currentProducts.addAll(it) }
                            updateOrAddAiMessage(aiMsgId, aiText, aiThought, sources = currentSources, products = currentProducts)
                        }
                        "tool_call" -> {
                            chunk.result?.let { result ->
                                if (result.success) {
                                    val mediaUrl = result.spinVideoUrl ?: result.tryOnMeta?.renderedImageUrl
                                    val mediaType = if (result.spinVideoUrl != null) "video" else if (result.tryOnMeta != null) "image" else null
                                    
                                    if (mediaUrl != null) {
                                        updateOrAddAiMessage(aiMsgId, aiText, aiThought, mediaUrl, mediaType, sources = currentSources, products = currentProducts)
                                    }
                                }
                            }
                        }
                        "done" -> {
                            isGenerating = false
                        }
                    }
                }
        }
    }

    fun sendCameraSnapshot(
        imageBase64: String,
        prompt: String? = null
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
                if (lensResponse.success && (lensResponse.detectedResult != null || lensResponse.apifyResults.isNotEmpty())) {
                    val products = mutableListOf<ProductItem>()
                    
                    lensResponse.detectedResult?.detectedItems?.forEachIndexed { index, item ->
                        products.add(
                            ProductItem(
                                id = "lens-det-$index",
                                name = item.detectedName,
                                brand = item.brandGuess,
                                category = item.category,
                                price = item.priceEstimate,
                                imageUrl = "",
                                rating = 4.8
                            )
                        )
                    }

                    lensResponse.apifyResults.forEachIndexed { index, match ->
                        if (!match.title.isNullOrBlank()) {
                            val priceVal = match.price?.replace(Regex("[^0-9.]"), "")?.toDoubleOrNull() ?: 0.0
                            products.add(
                                ProductItem(
                                    id = "lens-apify-$index",
                                    name = match.title,
                                    brand = match.source ?: "Lens Result",
                                    category = "Search Match",
                                    price = priceVal,
                                    imageUrl = match.imageUrl ?: "",
                                    rating = 4.8
                                )
                            )
                        }
                    }

                    val annotText = lensResponse.detectedResult?.hudAnnotationText ?: "Found ${products.size} visual matches via Spresso Lens Search."
                    updateOrAddAiMessage(
                        id = aiMsgId,
                        text = annotText,
                        products = products
                    )
                    isGenerating = false
                } else {
                    sendMessage(userPrompt, imageBase64 = imageBase64)
                }
            } catch (e: Exception) {
                isGenerating = false
                errorMessage = e.message
                sendMessage(userPrompt, imageBase64 = imageBase64)
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

    fun startVoiceStream() {
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
                    },
                    onReceiveText = { textChunk ->
                        accumulatedText += textChunk
                        updateOrAddAiMessage(voiceMsgId, accumulatedText)
                    },
                    onInterrupted = {
                        isVoiceSpeaking = false
                        isVoiceListening = true
                    }
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
                liveApiClient.sendAudioChunk(base64Audio)
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
        products: List<ProductItem> = emptyList()
    ) {
        val index = messages.indexOfFirst { it.id == id }
        val newMessage = ChatMessage(
            id = id, 
            text = text, 
            isUser = false, 
            thought = thought,
            mediaUrl = mediaUrl,
            mediaType = mediaType,
            sources = sources,
            products = products,
            isStreaming = isGenerating
        )
        if (index != -1) {
            messages[index] = newMessage
        } else {
            messages.add(newMessage)
        }
    }
}

