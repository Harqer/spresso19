package network

import io.ktor.client.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.websocket.*
import kotlinx.coroutines.isActive
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

@Serializable
data class ClientMessage(
    val audio: String? = null,
    val text: String? = null
)

@Serializable
data class ServerMessage(
    val type: String,
    val audio: String? = null,
    val text: String? = null,
    val interrupted: Boolean? = null,
    val error: String? = null,
    val message: String? = null
)

class LiveApiClient {
    private val client = HttpClient {
        install(WebSockets)
    }
    
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = false }
    private var session: DefaultClientWebSocketSession? = null

    @OptIn(ExperimentalEncodingApi::class)
    suspend fun connect(
        onReceiveAudio: (ByteArray) -> Unit,
        onReceiveText: (String) -> Unit,
        onInterrupted: () -> Unit = {}
    ) {
        val url = SpressoConfig.backendWebSocketUrl
        
        client.webSocket(urlString = url) {
            session = this
            
            while (isActive) {
                val incomingFrame = incoming.receive()
                if (incomingFrame is Frame.Text) {
                    val frameText = incomingFrame.readText()
                    try {
                        val serverMsg = json.decodeFromString<ServerMessage>(frameText)
                        when (serverMsg.type) {
                            "audio" -> {
                                serverMsg.audio?.let { base64Data ->
                                    val bytes = Base64.Default.decode(base64Data)
                                    onReceiveAudio(bytes)
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
                                // Session level error logged to console/logs if needed
                            }
                        }
                    } catch (_: Exception) {
                        // Safe ignore decode errors
                    }
                }
            }
        }
    }

    suspend fun sendAudioChunk(base64Audio: String) {
        val message = ClientMessage(audio = base64Audio)
        session?.send(json.encodeToString(message))
    }
    
    suspend fun sendTextContent(text: String) {
        val message = ClientMessage(text = text)
        session?.send(json.encodeToString(message))
    }
    
    fun close() {
        client.close()
    }
}
