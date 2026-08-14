package network

import io.ktor.client.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.websocket.*
import io.ktor.http.HttpHeaders
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    ERROR
}

@Serializable
data class AudioControlPayload(
    val action: String,
    val isMuted: Boolean? = null,
    val isPaused: Boolean? = null
)

@Serializable
data class ClientMessage(
    val audio: String? = null,
    val text: String? = null,
    val realtimeInput: RealtimeInput? = null,
    val clientContent: ClientContent? = null,
    val control: AudioControlPayload? = null
)

@Serializable
data class RealtimeInput(
    val mediaChunks: List<MediaChunk> = emptyList()
)

@Serializable
data class MediaChunk(
    val mimeType: String,
    val data: String
)

@Serializable
data class ClientContent(
    val turns: List<ContentTurn> = emptyList(),
    val turnComplete: Boolean = true
)

@Serializable
data class ContentTurn(
    val role: String = "user",
    val parts: List<ContentPart> = emptyList()
)

@Serializable
data class ContentPart(
    val text: String? = null
)

@Serializable
data class ServerMessage(
    val type: String? = null,
    val audio: String? = null,
    val text: String? = null,
    val interrupted: Boolean? = null,
    val error: String? = null,
    val message: String? = null,
    val serverContent: ServerContent? = null
)

@Serializable
data class ServerContent(
    val modelTurn: ModelTurn? = null,
    val turnComplete: Boolean? = null,
    val interrupted: Boolean? = null
)

@Serializable
data class ModelTurn(
    val parts: List<ModelPart> = emptyList()
)

@Serializable
data class ModelPart(
    val text: String? = null,
    val inlineData: InlineData? = null
)

@Serializable
data class InlineData(
    val mimeType: String,
    val data: String
)

open class LiveApiClient {
    companion object {
        const val DEFAULT_WEBSOCKET_URL = "wss://spresso-5561f.web.app/api/live-chef"
        const val INPUT_SAMPLE_RATE = 16000
        const val OUTPUT_SAMPLE_RATE = 24000
        const val DEFAULT_INPUT_MIME = "audio/pcm;rate=16000"
        const val DEFAULT_OUTPUT_MIME = "audio/pcm;rate=24000"
        const val MAX_RECONNECT_ATTEMPTS = 5
        const val INITIAL_RECONNECT_DELAY_MS = 1000L
    }

    private val client = HttpClient {
        install(WebSockets)
    }

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = false }
    private var session: DefaultClientWebSocketSession? = null

    var connectionState: ConnectionState = ConnectionState.DISCONNECTED
        private set

    var isMuted: Boolean = false
        private set

    var isPaused: Boolean = false
        private set

    private var isManuallyClosed = false

    @OptIn(ExperimentalEncodingApi::class)
    open suspend fun connect(
        onReceiveAudio: (ByteArray) -> Unit,
        onReceiveText: (String) -> Unit,
        onInterrupted: () -> Unit = {},
        onStateChanged: (ConnectionState) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        isManuallyClosed = false
        val configuredUrl = try { SpressoConfig.backendWebSocketUrl } catch (_: Exception) { "" }
        val url = if (configuredUrl.isNotBlank()) configuredUrl else DEFAULT_WEBSOCKET_URL
        val authToken = getCurrentUserIdToken()

        var attempt = 0

        while (!isManuallyClosed) {
            try {
                connectionState = if (attempt == 0) ConnectionState.CONNECTING else ConnectionState.RECONNECTING
                onStateChanged(connectionState)

                client.webSocket(
                    urlString = url,
                    request = {
                        if (!authToken.isNullOrEmpty()) {
                            header(HttpHeaders.Authorization, "Bearer $authToken")
                        }
                    }
                ) {
                    session = this
                    connectionState = ConnectionState.CONNECTED
                    onStateChanged(ConnectionState.CONNECTED)
                    attempt = 0 // Reset reconnect attempts on successful handshake

                    while (isActive && !isManuallyClosed) {
                        val incomingFrame = incoming.receive()
                        if (incomingFrame is Frame.Text) {
                            val frameText = incomingFrame.readText()
                            try {
                                val serverMsg = json.decodeFromString<ServerMessage>(frameText)

                                // Standard type-based message handling (24kHz PCM output decoding)
                                when (serverMsg.type) {
                                    "audio" -> {
                                        if (!isMuted && !isPaused) {
                                            serverMsg.audio?.let { base64Data ->
                                                val bytes = Base64.Default.decode(base64Data)
                                                onReceiveAudio(bytes)
                                            }
                                        }
                                    }
                                    "text" -> {
                                        serverMsg.text?.let { textData ->
                                            onReceiveText(textData)
                                        }
                                    }
                                    "interrupted" -> {
                                        if (serverMsg.interrupted == true) {
                                            onInterrupted()
                                        }
                                    }
                                    "error" -> {
                                        serverMsg.error?.let { err -> onError(err) }
                                    }
                                }

                                // Handle Gemini Live Protocol (serverContent with inline 24kHz PCM audio)
                                serverMsg.serverContent?.let { content ->
                                    if (content.interrupted == true) {
                                        onInterrupted()
                                    }
                                    content.modelTurn?.parts?.forEach { part ->
                                        part.text?.let { t -> onReceiveText(t) }
                                        part.inlineData?.let { inline ->
                                            if (inline.mimeType.startsWith("audio") && !isMuted && !isPaused) {
                                                val bytes = Base64.Default.decode(inline.data)
                                                onReceiveAudio(bytes)
                                            }
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                println("LiveApiClient frame decode error: ${e.message}")
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                session = null
                if (isManuallyClosed) {
                    connectionState = ConnectionState.DISCONNECTED
                    onStateChanged(ConnectionState.DISCONNECTED)
                    break
                }

                attempt++
                if (attempt <= MAX_RECONNECT_ATTEMPTS) {
                    connectionState = ConnectionState.RECONNECTING
                    onStateChanged(ConnectionState.RECONNECTING)
                    val backoffDelay = INITIAL_RECONNECT_DELAY_MS * (1L shl (attempt - 1))
                    delay(backoffDelay)
                } else {
                    connectionState = ConnectionState.ERROR
                    onStateChanged(ConnectionState.ERROR)
                    onError("WebSocket connection failed after $MAX_RECONNECT_ATTEMPTS reconnect attempts: ${e.message}")
                    break
                }
            }
        }

        if (isManuallyClosed) {
            connectionState = ConnectionState.DISCONNECTED
            onStateChanged(ConnectionState.DISCONNECTED)
        }
    }

    @OptIn(ExperimentalEncodingApi::class)
    open suspend fun sendAudioChunk(base64Audio: String, mimeType: String = DEFAULT_INPUT_MIME) {
        if (isMuted || isPaused || connectionState != ConnectionState.CONNECTED) return
        val message = ClientMessage(
            audio = base64Audio,
            realtimeInput = RealtimeInput(
                mediaChunks = listOf(MediaChunk(mimeType = mimeType, data = base64Audio))
            )
        )
        session?.send(json.encodeToString(message))
    }

    open suspend fun sendVideoFrame(base64Image: String, mimeType: String = "image/jpeg") {
        if (connectionState != ConnectionState.CONNECTED) return
        val message = ClientMessage(
            realtimeInput = RealtimeInput(
                mediaChunks = listOf(MediaChunk(mimeType = mimeType, data = base64Image))
            )
        )
        session?.send(json.encodeToString(message))
    }

    open suspend fun sendTextContent(text: String) {
        if (connectionState != ConnectionState.CONNECTED) return
        val message = ClientMessage(
            text = text,
            clientContent = ClientContent(
                turns = listOf(ContentTurn(role = "user", parts = listOf(ContentPart(text = text)))),
                turnComplete = true
            )
        )
        session?.send(json.encodeToString(message))
    }

    suspend fun sendMute(muted: Boolean) {
        isMuted = muted
        val message = ClientMessage(
            control = AudioControlPayload(action = if (muted) "mute" else "unmute", isMuted = muted)
        )
        try {
            session?.send(json.encodeToString(message))
        } catch (e: Exception) {
            println("LiveApiClient sendMute error: ${e.message}")
        }
    }

    suspend fun sendPause() {
        isPaused = true
        val message = ClientMessage(
            control = AudioControlPayload(action = "pause", isPaused = true)
        )
        try {
            session?.send(json.encodeToString(message))
        } catch (e: Exception) {
            println("LiveApiClient sendPause error: ${e.message}")
        }
    }

    suspend fun sendResume() {
        isPaused = false
        val message = ClientMessage(
            control = AudioControlPayload(action = "resume", isPaused = false)
        )
        try {
            session?.send(json.encodeToString(message))
        } catch (e: Exception) {
            println("LiveApiClient sendResume error: ${e.message}")
        }
    }

    suspend fun sendInterrupt() {
        val message = ClientMessage(
            control = AudioControlPayload(action = "interrupt")
        )
        try {
            session?.send(json.encodeToString(message))
        } catch (e: Exception) {
            println("LiveApiClient sendInterrupt error: ${e.message}")
        }
    }

    open fun close() {
        isManuallyClosed = true
        session = null
        connectionState = ConnectionState.DISCONNECTED
        client.close()
    }
}

