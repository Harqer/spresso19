package viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import network.ChatMessage
import network.ConnectionState
import network.ConvexApi
import network.LiveApiClient
import network.ProductItem
import network.models.GroundingSource
import utils.PlatformUtils

internal class ChatThreadCache {
    private val mutex = Mutex()
    private var threadId: String? = null
    private var generation = 0L

    suspend fun getOrCreate(createThread: suspend () -> String): String =
        mutex.withLock {
            threadId ?: run {
                val currentGeneration = generation
                val createdThreadId = createThread()
                if (generation == currentGeneration) threadId = createdThreadId
                createdThreadId
            }
        }

    fun clear() {
        generation += 1
        threadId = null
    }
}

internal class OrderedTaskQueue(private val scope: CoroutineScope) {
    private var lastTask: Job? = null
    private var blocked = false

    fun enqueue(
        task: suspend () -> Boolean,
        onFailure: () -> Unit = {},
        onBlocked: () -> Unit = {},
    ) {
        val previousTask = lastTask
        lastTask =
            scope.launch {
                try {
                    previousTask?.join()
                } catch (cancelled: CancellationException) {
                    if (scope.coroutineContext[Job]?.isActive == false) throw cancelled
                }
                if (blocked) {
                    onBlocked()
                    return@launch
                }
                try {
                    if (!task()) {
                        blocked = true
                        onFailure()
                    }
                } catch (cancelled: CancellationException) {
                    if (scope.coroutineContext[Job]?.isActive == false) throw cancelled
                    blocked = true
                    onFailure()
                } catch (error: Exception) {
                    blocked = true
                    onFailure()
                }
            }
    }
}

internal suspend fun persistLiveTurnWithRetry(
    save: suspend () -> Unit,
    onFailure: () -> Unit,
    waitBeforeRetry: suspend (Long) -> Unit = { delay(it) },
): Boolean {
    var attempt = 0
    while (attempt < 3) {
        try {
            save()
            return true
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (error: Exception) {
            attempt += 1
            if (attempt >= 3) {
                onFailure()
                return false
            }
            waitBeforeRetry(500L * (1L shl (attempt - 1)))
        }
    }
    return false
}

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
    private var voiceStartGeneration = 0L
    private val threadCache = ChatThreadCache()
    private val liveTurnPersistenceQueue = OrderedTaskQueue(scope)
    private var requestGeneration = 0L
    private var activeRequestCount = 0
    private val lateInputTurns = mutableMapOf<String, String>()

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
                val activeThreadId = ensureChatThread()
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
                    if (assistant != null && assistant.status != "streaming" && assistant.text.isNotBlank()) break
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
        val startGeneration = ++voiceStartGeneration

        val voiceSessionId = PlatformUtils.generateUUID().replace("-", "_")
        var turnIndex = 0
        var assistantTranscript = ""
        var currentUserMessageId = "voice_user_${voiceSessionId}_$turnIndex"
        var currentUserTranscript = ""
        var pendingLateInputTurnId: String? = null
        var pendingLateInputTranscript = ""
        var currentAssistantMessageId = "voice_assistant_${voiceSessionId}_$turnIndex"
        var voiceConnectCompleted = false

        fun advanceToNextVoiceTurn() {
            turnIndex += 1
            assistantTranscript = ""
            currentUserTranscript = ""
            pendingLateInputTurnId = null
            pendingLateInputTranscript = ""
            liveTranscript = ""
            currentUserMessageId = "voice_user_${voiceSessionId}_$turnIndex"
            currentAssistantMessageId = "voice_assistant_${voiceSessionId}_$turnIndex"
        }

        scope.launch {
            val liveThreadId = try {
                ensureChatThread()
            } catch (error: Exception) {
                if (startGeneration == voiceStartGeneration) {
                    isVoiceActive = false
                    isVoiceListening = false
                    isVoiceSpeaking = false
                    errorMessage = error.message ?: "Unable to prepare voice chat. Please try again."
                }
                return@launch
            }
            if (startGeneration != voiceStartGeneration) return@launch
            try {
                // Resolve the canonical thread before connecting so every
                // finalized turn is queued against the same durable thread.
                liveApiClient.connect(
                    onReceiveAudio = { pcmBytes ->
                        if (startGeneration == voiceStartGeneration) {
                            isVoiceSpeaking = true
                            isVoiceListening = false
                            onReceiveAudio?.invoke(pcmBytes)
                        }
                    },
                    onReceiveText = { textChunk ->
                        if (startGeneration == voiceStartGeneration) {
                            assistantTranscript += textChunk
                            liveTranscript = assistantTranscript
                            updateOrAddAiMessage(currentAssistantMessageId, assistantTranscript, isStreaming = true)
                        }
                    },
                    onReceiveInputTranscription = { text, isFinal ->
                        if (startGeneration == voiceStartGeneration && text.isNotBlank()) {
                            if (isFinal && pendingLateInputTurnId != null) {
                                val previousTranscript = pendingLateInputTranscript
                                val merged = network.mergeFinalizedTranscript(previousTranscript, text)
                                if (merged != previousTranscript) {
                                    pendingLateInputTranscript = merged
                                    val lateTurnId = pendingLateInputTurnId!!
                                    updateOrAddUserMessage("voice_user_$lateTurnId", merged)
                                    persistLateInput(liveThreadId, lateTurnId, merged)
                                }
                            } else {
                                if (isFinal) currentUserTranscript = text
                                updateOrAddUserMessage(currentUserMessageId, text)
                            }
                        }
                    },
                    onReceiveOutputTranscription = { text ->
                        if (startGeneration == voiceStartGeneration) {
                            assistantTranscript = text
                            liveTranscript = text
                            if (text.isNotBlank()) updateOrAddAiMessage(currentAssistantMessageId, text, isStreaming = true)
                        }
                    },
                    onInterrupted = {
                        if (startGeneration == voiceStartGeneration) {
                            // Barge-in: stop queued playback and remove the
                            // interrupted assistant partial before new output arrives.
                            onPlaybackInterrupted?.invoke()
                            assistantTranscript = ""
                            liveTranscript = ""
                            removeMessage(currentAssistantMessageId)
                            isVoiceSpeaking = false
                            isVoiceListening = true
                        }
                    },
                    onTurnComplete = { finalizedUserTranscript, finalizedAssistantTranscript, _ ->
                        if (startGeneration == voiceStartGeneration) {
                            // Use the finalized text accumulated before turnComplete.
                            // The provider may send input transcription after this boundary.
                            onPlaybackInterrupted?.invoke()
                            isVoiceSpeaking = false
                            isVoiceListening = true
                            val userTranscript = currentUserTranscript.ifBlank { finalizedUserTranscript }
                            val turnId = "${voiceSessionId}_$turnIndex"
                            if (finalizedAssistantTranscript.isNotBlank() && userTranscript.isNotBlank()) {
                                pendingLateInputTurnId = turnId
                                pendingLateInputTranscript = userTranscript
                            }
                            if (userTranscript.isNotBlank()) {
                                currentUserTranscript = userTranscript
                                updateOrAddUserMessage(currentUserMessageId, userTranscript)
                            } else if (finalizedAssistantTranscript.isBlank()) {
                                removeMessage(currentUserMessageId)
                            }
                            if (finalizedAssistantTranscript.isNotBlank()) {
                                updateOrAddAiMessage(currentAssistantMessageId, finalizedAssistantTranscript, isStreaming = false)
                            } else if (userTranscript.isBlank()) {
                                removeMessage(currentAssistantMessageId)
                            }
                            if (userTranscript.isNotBlank() || finalizedAssistantTranscript.isNotBlank()) {
                                persistLiveTurn(
                                    threadId = liveThreadId,
                                    turnId = turnId,
                                    userTranscript = userTranscript,
                                    assistantTranscript = finalizedAssistantTranscript,
                                )
                            }

                            advanceToNextVoiceTurn()
                            // Re-arm late-input reconciliation AFTER the turn index
                            // advanced: the provider may deliver the final input
                            // transcription for the just-completed turn.
                            if (finalizedAssistantTranscript.isNotBlank() && userTranscript.isNotBlank()) {
                                pendingLateInputTurnId = turnId
                                pendingLateInputTranscript = userTranscript
                            }
                        }
                    },
                    onStateChanged = { state ->
                        if (startGeneration == voiceStartGeneration && state == ConnectionState.DISCONNECTED) {
                            voiceConnectCompleted = true
                        }
                        if (startGeneration == voiceStartGeneration && state == ConnectionState.RECONNECTING) {
                            // The old generation is unrecoverable: drop its
                            // interim UI and let Gemini resume from its handle.
                            removeMessage(currentUserMessageId)
                            removeMessage(currentAssistantMessageId)
                            advanceToNextVoiceTurn()
                        }
                        if (startGeneration == voiceStartGeneration && state == ConnectionState.CONNECTED) {
                            isVoiceListening = true
                            isVoiceSpeaking = false
                        }
                        if (startGeneration == voiceStartGeneration && state == ConnectionState.ERROR) {
                            isVoiceActive = false
                            isVoiceListening = false
                            isVoiceSpeaking = false
                        }
                    },
                )
            } catch (cancelled: CancellationException) {
                if (startGeneration == voiceStartGeneration) {
                    isVoiceActive = false
                    isVoiceListening = false
                    isVoiceSpeaking = false
                }
                throw cancelled
            } catch (e: Exception) {
                if (startGeneration == voiceStartGeneration) {
                    isVoiceActive = false
                    isVoiceListening = false
                    isVoiceSpeaking = false
                    errorMessage = e.message ?: "Voice stream connection error."
                }
            } finally {
                if (startGeneration == voiceStartGeneration && voiceConnectCompleted && liveApiClient.connectionState == ConnectionState.DISCONNECTED) {
                    isVoiceActive = false
                    isVoiceListening = false
                    isVoiceSpeaking = false
                }
            }
        }
    }

    fun stopVoiceStream() {
        voiceStartGeneration += 1
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

    private suspend fun ensureChatThread(): String =
        threadCache.getOrCreate { apiClient.createChatThread("Spresso discovery") }

    private fun persistLateInput(
        threadId: String,
        turnId: String,
        userTranscript: String,
    ) {
        liveTurnPersistenceQueue.enqueue(
            task = {
                apiClient.updateLiveTurnUserTranscript(
                    threadId = threadId,
                    turnId = turnId,
                    userTranscript = userTranscript,
                )
            },
            onFailure = { errorMessage = "Unable to update this voice transcript. Please try again." },
            onBlocked = { errorMessage = "A previous voice turn could not be saved. Later turns were not added to history." },
        )
    }

    private fun persistLiveTurn(
        threadId: String,
        turnId: String,
        userTranscript: String,
        assistantTranscript: String,
    ) {
        liveTurnPersistenceQueue.enqueue(
            task = {
                persistLiveTurnWithRetry(
                    save = {
                        apiClient.saveLiveTurn(
                            threadId = threadId,
                            turnId = turnId,
                            userTranscript = userTranscript,
                            assistantTranscript = assistantTranscript,
                        )
                    },
                    onFailure = {},
                )
            },
            onFailure = { errorMessage = "Unable to save this voice turn. Please try again." },
            onBlocked = {
                errorMessage = "A previous voice turn could not be saved. Later turns were not added to history."
            },
        )
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

    private fun updateOrAddUserMessage(
        id: String,
        text: String,
    ) {
        val index = messages.indexOfFirst { it.id == id }
        val newMessage = ChatMessage(id = id, text = text, isUser = true)
        if (index != -1) {
            messages[index] = newMessage
        } else {
            messages.add(newMessage)
        }
    }

    private fun removeMessage(id: String) {
        val index = messages.indexOfFirst { it.id == id }
        if (index != -1) messages.removeAt(index)
    }

    fun clearSession() {
        stopVoiceStream()
        requestGeneration += 1
        activeRequestCount = 0
        messages.clear()
        threadCache.clear()
        errorMessage = null
        isGenerating = false
    }
}
