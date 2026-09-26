package network

import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.DefaultClientWebSocketSession
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import io.ktor.websocket.send
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import kotlinx.serialization.json.putJsonArray
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

internal const val LIVE_MODEL = "models/gemini-3.8-live"
internal const val LIVE_ASSISTANT_INSTRUCTION =
    "You are Spresso's concise, safety-conscious live shopping assistant. Help the user discover products using the camera and microphone."

/** Top-level BidiGenerateContentSetup fields locked by this AuthToken. */
internal const val LIVE_TOKEN_FIELD_MASK =
    "model,generationConfig,systemInstruction,tools,inputAudioTranscription,outputAudioTranscription"

internal fun liveTokenRequestBody(): JsonObject =
    buildJsonObject {
        put("uses", 1)
        putJsonObject("bidiGenerateContentSetup") {
            put("model", LIVE_MODEL)
            putJsonObject("generationConfig") {
                put("responseModalities", buildJsonArray { add(kotlinx.serialization.json.JsonPrimitive("AUDIO")) })
            }
            putJsonObject("sessionResumption") { }
            putJsonObject("inputAudioTranscription") { }
            putJsonObject("outputAudioTranscription") { }
            putJsonObject("systemInstruction") {
                put("parts", buildJsonArray {
                    add(buildJsonObject { put("text", LIVE_ASSISTANT_INSTRUCTION) })
                })
            }
            put("tools", buildJsonArray { })
        }
        put("fieldMask", LIVE_TOKEN_FIELD_MASK)
    }


internal fun liveSetupMessage(resumptionHandle: String? = null): JsonObject =
    buildJsonObject {
        putJsonObject("setup") {
            put("model", LIVE_MODEL)
            putJsonObject("generationConfig") {
                put("responseModalities", buildJsonArray { add(kotlinx.serialization.json.JsonPrimitive("AUDIO")) })
            }
            put("systemInstruction", buildJsonObject {
                put("parts", buildJsonArray {
                    add(buildJsonObject { put("text", LIVE_ASSISTANT_INSTRUCTION) })
                })
            })
            put("tools", buildJsonArray { })
            put("inputAudioTranscription", buildJsonObject { })
            put("outputAudioTranscription", buildJsonObject { })
            putJsonObject("sessionResumption") {
                if (!resumptionHandle.isNullOrBlank()) put("handle", resumptionHandle)
            }
        }
    }

internal fun encodeLiveTokenQueryParameter(value: String): String {
    val hex = "0123456789ABCDEF"
    return buildString(value.length) {
        value.encodeToByteArray().forEach { byte ->
            val code = byte.toInt() and 0xFF
            val char = code.toChar()
            if (code in 0x41..0x5A || code in 0x61..0x7A || code in 0x30..0x39 || char in "-_.~") {
                append(char)
            } else {
                append('%')
                append(hex[code shr 4])
                append(hex[code and 0x0F])
            }
        }
    }
}

internal fun liveAudioInputMessage(base64Audio: String, mimeType: String = LiveApiClient.DEFAULT_INPUT_MIME): JsonObject =
    buildJsonObject {
        putJsonObject("realtimeInput") {
            putJsonObject("audio") {
                put("mimeType", mimeType)
                put("data", base64Audio)
            }
        }
    }

internal fun liveVideoInputMessage(base64Image: String, mimeType: String = "image/jpeg"): JsonObject =
    buildJsonObject {
        putJsonObject("realtimeInput") {
            putJsonObject("video") {
                put("mimeType", mimeType)
                put("data", base64Image)
            }
        }
    }

internal fun liveTextInputMessage(text: String): JsonObject =
    buildJsonObject {
        putJsonObject("realtimeInput") { put("text", text) }
    }

internal fun liveAudioStreamEndMessage(): JsonObject =
    buildJsonObject {
        putJsonObject("realtimeInput") { put("audioStreamEnd", true) }
    }

internal fun liveMessageEnvelopes(message: JsonObject): Set<String> =
    setOf("setup", "clientContent", "realtimeInput", "toolResponse").filterTo(mutableSetOf()) { it in message }

private val liveClientJson = Json { encodeDefaults = false }

internal fun encodeLiveMessage(message: JsonObject): String = liveClientJson.encodeToString(message)

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    ERROR,
}

@Serializable
data class AgentEngineBidiStreamOutput(
    val output: AgentEngineOutput? = null,
)

@Serializable
data class AgentEngineOutput(
    @SerialName("inline_data") val inlineData: AgentEngineInlineData? = null,
    val part: AgentEnginePart? = null,
    @SerialName("end_of_turn") val endOfTurn: Boolean? = null,
)

@Serializable
data class AgentEngineInlineData(
    @SerialName("mime_type") val mimeType: String? = null,
    val data: String? = null,
)

@Serializable
data class AgentEnginePart(
    val text: String? = null,
)

@Serializable
data class ServerMessage(
    val error: JsonElement? = null,
    val message: String? = null,
    val setupComplete: JsonObject? = null,
    val serverContent: ServerContent? = null,
    val sessionResumptionUpdate: SessionResumptionUpdate? = null,
    val goAway: GoAway? = null,
    val toolCall: JsonObject? = null,
    val toolCallCancellation: JsonObject? = null,
    val bidiStreamOutput: AgentEngineBidiStreamOutput? = null,
)

internal fun isLegacyTurnComplete(message: ServerMessage): Boolean =
    message.serverContent == null && message.bidiStreamOutput?.output?.endOfTurn == true

@Serializable
data class ServerContent(
    val modelTurn: ModelTurn? = null,
    val turnComplete: Boolean? = null,
    val generationComplete: Boolean? = null,
    val interrupted: Boolean? = null,
    val inputTranscription: Transcription? = null,
    val interimInputTranscription: Transcription? = null,
    val outputTranscription: Transcription? = null,
)

@Serializable
data class Transcription(
    val text: String? = null,
)

@Serializable
data class SessionResumptionUpdate(
    val newHandle: String? = null,
    val resumable: Boolean? = null,
)

@Serializable
data class GoAway(
    val timeLeft: JsonElement? = null,
)

@Serializable
data class ModelTurn(
    val parts: List<ModelPart> = emptyList(),
)

@Serializable
data class ModelPart(
    val text: String? = null,
    val inlineData: InlineData? = null,
)

@Serializable
data class InlineData(
    val mimeType: String,
    val data: String,
)

open class LiveApiClient {
    companion object {
        const val INPUT_SAMPLE_RATE = 16000
        const val OUTPUT_SAMPLE_RATE = 24000
        const val DEFAULT_INPUT_MIME = "audio/pcm;rate=16000"
        const val DEFAULT_OUTPUT_MIME = "audio/pcm;rate=24000"
        const val MAX_RECONNECT_ATTEMPTS = 5
        const val INITIAL_RECONNECT_DELAY_MS = 1000L
    }

    private val json =
        Json {
            ignoreUnknownKeys = true
            encodeDefaults = false
        }

    private var client: HttpClient? = null

    private fun ensureClient(): HttpClient =
        client ?: HttpClient { install(WebSockets) }.also { client = it }

    private var session: DefaultClientWebSocketSession? = null
    private var activeOnStateChanged: ((ConnectionState) -> Unit)? = null

    private val _connectionStateFlow = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionStateFlow: StateFlow<ConnectionState> = _connectionStateFlow.asStateFlow()

    var connectionState: ConnectionState = ConnectionState.DISCONNECTED
        private set

    val isSetupComplete: Boolean get() = setupComplete

    var isMuted: Boolean = false
        private set

    var isPaused: Boolean = false
        private set

    private var generation = 0L
    var sessionGeneration: Long = 0L
        private set

    private var resumptionHandle: String? = null
    private var setupComplete = false
    private var cancelRequested = false
    private var fatalSessionError = false
    private var reconnectAttempts = 0
    private var connectionHadSetup = false
    private val transcript = LiveTranscriptAccumulator()

    @OptIn(ExperimentalEncodingApi::class)
    open suspend fun connect(
        onReceiveAudio: (ByteArray) -> Unit,
        onReceiveText: (String) -> Unit,
        onReceiveInputTranscription: (String, Boolean) -> Unit = { _, _ -> },
        onReceiveOutputTranscription: (String) -> Unit = {},
        onInterrupted: () -> Unit = {},
        onStateChanged: (ConnectionState) -> Unit = {},
        onError: (String) -> Unit = {},
        onTurnComplete: (userTranscript: String, assistantTranscript: String, interrupted: Boolean) -> Unit = { _, _, _ -> },
    ) {
        val myGeneration = ++generation
        activeOnStateChanged = onStateChanged
        cancelRequested = false
        fatalSessionError = false
        resumptionHandle = null
        connectionHadSetup = false
        reconnectAttempts = 0
        transcript.reset()

        while (myGeneration == generation) {
            if (getCurrentUserIdToken().isNullOrBlank()) {
                failConnection("Sign in to start a voice conversation.", onStateChanged, onError)
                break
            }

            var sessionSetupComplete = false
            var failure: Exception? = null
            try {
                setConnectionState(
                    if (reconnectAttempts == 0) ConnectionState.CONNECTING else ConnectionState.RECONNECTING,
                    onStateChanged,
                )
                setupComplete = false

                val tokenResponse =
                    ensureClient()
                        .post("${SpressoConfig.convexSiteUrl}/api/live/token") {
                            val authToken = getCurrentUserIdToken()
                            if (authToken.isNullOrBlank()) error("Sign in to start a voice conversation.")
                            header(HttpHeaders.Authorization, "Bearer $authToken")
                            header(HttpHeaders.ContentType, "application/json")
                            setBody("{}")
                        }
                val tokenBody = tokenResponse.bodyAsText()
                if (tokenResponse.status.value !in 200..299) {
                    val detail = runCatching {
                        json.parseToJsonElement(tokenBody).jsonObject["error"]?.jsonPrimitive?.contentOrNull
                    }.getOrNull()
                    error(detail ?: "The voice assistant is temporarily unavailable.")
                }
                val tokenResponseJson = json.parseToJsonElement(tokenBody).jsonObject
                val sessionToken =
                    tokenResponseJson["token"]?.jsonPrimitive?.content
                        ?: error(tokenResponseJson["error"]?.jsonPrimitive?.content ?: "Failed to retrieve the voice token.")
                val wsUrl =
                    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeLiveTokenQueryParameter(sessionToken)}"

                ensureClient().webSocket(urlString = wsUrl) {
                    session = this
                    sessionGeneration += 1
                    send(encodeLiveMessage(liveSetupMessage(resumptionHandle)))

                    for (incomingFrame in incoming) {
                        if (!isActive || myGeneration != generation) break
                        if (incomingFrame !is Frame.Text) continue

                        val serverMsg = try {
                            json.decodeFromString<ServerMessage>(incomingFrame.readText())
                        } catch (cancelled: CancellationException) {
                            throw cancelled
                        } catch (decodeError: Exception) {
                            network.Telemetry.recordError("Unable to decode Gemini Live event", decodeError)
                            continue
                        }

                        if (serverMsg.error != null) {
                            fatalSessionError = true
                            val providerMessage =
                                runCatching {
                                    (serverMsg.error as? JsonObject)?.get("message")?.jsonPrimitive?.contentOrNull
                                        ?: serverMsg.error.jsonPrimitive.contentOrNull
                                }.getOrNull()
                                    ?: serverMsg.message
                                    ?: "The voice connection reported an error."
                            throw IllegalStateException(providerMessage)
                        }
                        if (serverMsg.setupComplete != null) {
                            setupComplete = true
                            sessionSetupComplete = true
                            connectionHadSetup = true
                            setConnectionState(ConnectionState.CONNECTED, onStateChanged)
                        }
                        serverMsg.sessionResumptionUpdate?.let { update ->
                            resumptionHandle = if (update.resumable == true) update.newHandle?.takeIf(String::isNotBlank) else null
                        }
                        if (serverMsg.goAway != null) {
                            // A resumable session remains open until the provider closes it.
                            continue
                        }
                        if (serverMsg.toolCall != null || serverMsg.toolCallCancellation != null) {
                            fatalSessionError = true
                            throw IllegalStateException("The live assistant returned an unsupported action.")
                        }

                        val content = serverMsg.serverContent ?: continue
                        val wasInterrupted = content.interrupted == true
                        if (wasInterrupted) {
                            transcript.interrupt()
                            onInterrupted()
                        }
                        content.interimInputTranscription?.text?.let { partial ->
                            onReceiveInputTranscription(transcript.setInterimInput(partial), false)
                        }
                        content.inputTranscription?.text?.let { finalInput ->
                            onReceiveInputTranscription(transcript.appendInput(finalInput), true)
                        }
                        if (!wasInterrupted) {
                            content.outputTranscription?.text?.let { output ->
                                onReceiveOutputTranscription(transcript.appendOutput(output))
                            }
                            content.modelTurn?.parts?.forEach { part ->
                                part.text?.let { text ->
                                    transcript.appendModelText(text)
                                    onReceiveText(text)
                                }
                                part.inlineData?.let { inline ->
                                    if (inline.mimeType.startsWith("audio")) transcript.markAssistantAudio()
                                    if (inline.mimeType.startsWith("audio") && !isMuted && !isPaused) {
                                        onReceiveAudio(Base64.Default.decode(inline.data))
                                    }
                                }
                            }
                        }
                        if (content.turnComplete == true) {
                            transcript.completeTurn()?.let { completed ->
                                reconnectAttempts = 0
                                onTurnComplete(completed.userTranscript, completed.assistantTranscript, completed.interrupted)
                            }
                        }
                    }
                }
            } catch (cancelled: CancellationException) {
                if (myGeneration != generation || cancelRequested) return
                throw cancelled
            } catch (error: Exception) {
                failure = error
                network.Telemetry.recordError("Gemini Live connection failed", error)
            } finally {
                session = null
                setupComplete = false
            }

            if (myGeneration != generation || cancelRequested) break
            if (fatalSessionError) {
                failConnection("The voice assistant could not continue. Please try again.", onStateChanged, onError)
                break
            }

            reconnectAttempts += 1
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                val message = if (connectionHadSetup) {
                    "The voice assistant disconnected repeatedly. Please restart voice chat."
                } else {
                    "The voice connection could not be established. Please try again."
                }
                failConnection(message, onStateChanged, onError)
                break
            }

            // An interrupted, incomplete turn is never persisted or replayed.
            if (sessionSetupComplete) transcript.reset()
            setConnectionState(ConnectionState.RECONNECTING, onStateChanged)
            delay(INITIAL_RECONNECT_DELAY_MS * (1L shl (reconnectAttempts - 1)))
        }

        if (myGeneration == generation && connectionState != ConnectionState.ERROR) {
            setConnectionState(ConnectionState.DISCONNECTED, onStateChanged)
        }
    }

    @OptIn(ExperimentalEncodingApi::class)
    open suspend fun sendAudioChunk(
        base64Audio: String,
        mimeType: String = DEFAULT_INPUT_MIME,
    ) {
        if (isMuted || isPaused || connectionState != ConnectionState.CONNECTED || !setupComplete) return
        sendRealtime(liveAudioInputMessage(base64Audio, mimeType))
    }

    open suspend fun sendVideoFrame(
        base64Image: String,
        mimeType: String = "image/jpeg",
    ) {
        if (connectionState != ConnectionState.CONNECTED || !setupComplete) return
        sendRealtime(liveVideoInputMessage(base64Image, mimeType))
    }

    open suspend fun sendTextContent(text: String) {
        if (connectionState != ConnectionState.CONNECTED || !setupComplete) return
        sendRealtime(liveTextInputMessage(text))
    }

    private suspend fun sendRealtime(message: JsonObject) {
        check(connectionState == ConnectionState.CONNECTED && setupComplete) {
            "The voice connection is not ready to receive input."
        }
        val activeSession = session ?: error("The voice connection is not ready to receive input.")
        activeSession.send(encodeLiveMessage(message))
    }

    suspend fun sendMute(muted: Boolean) {
        isMuted = muted
        if (muted) sendAudioStreamEndIfSetupComplete()
    }

    suspend fun sendPause() {
        isPaused = true
        sendAudioStreamEndIfSetupComplete()
    }

    suspend fun sendResume() {
        isPaused = false
    }

    suspend fun sendInterrupt() = Unit

    private suspend fun sendAudioStreamEndIfSetupComplete() {
        if (connectionState == ConnectionState.CONNECTED && setupComplete) {
            session?.send(encodeLiveMessage(liveAudioStreamEndMessage()))
        }
    }

    private fun failConnection(
        message: String,
        onStateChanged: (ConnectionState) -> Unit,
        onError: (String) -> Unit,
    ) {
        setupComplete = false
        transcript.reset()
        setConnectionState(ConnectionState.ERROR, onStateChanged)
        onError(message)
    }

    private fun setConnectionState(
        state: ConnectionState,
        onStateChanged: (ConnectionState) -> Unit,
    ) {
        if (connectionState == state) return
        connectionState = state
        _connectionStateFlow.value = state
        onStateChanged(state)
    }

    open fun close() {
        cancelRequested = true
        generation++
        session?.cancel()
        session = null
        setupComplete = false
        fatalSessionError = false
        resumptionHandle = null
        connectionHadSetup = false
        transcript.reset()
        setConnectionState(ConnectionState.DISCONNECTED, activeOnStateChanged ?: {})
        activeOnStateChanged = null
        client?.close()
        client = null
    }
}
