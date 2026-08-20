package audio

import kotlinx.browser.document
import kotlinx.browser.window
import org.khronos.webgl.Int16Array
import org.w3c.dom.MessageEvent
import kotlin.js.Promise

actual class AudioRecorder {
    actual var onAudioChunk: ((ByteArray) -> Unit)? = null
    actual var onError: ((Exception) -> Unit)? = null
    private var isRecording = false
    private var audioContext: dynamic = null
    private var mediaStream: dynamic = null
    private var sourceNode: dynamic = null
    private var workletNode: dynamic = null

    actual fun startRecording() {
        if (isRecording) return
        isRecording = true

        val navigator = window.navigator.asDynamic()
        val mediaDevices = navigator.mediaDevices
        
        if (mediaDevices == null) {
            println("MediaDevices API not available. Cannot record audio.")
            isRecording = false
            return
        }

        val constraints = js("({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })")
        
        val promise = mediaDevices.getUserMedia(constraints) as Promise<dynamic>
        promise.then { stream ->
            if (!isRecording) {
                // Was stopped while waiting for permission
                stream.getTracks().forEach { it.stop() }
                return@then null
            }
            
            mediaStream = stream
            
            val context = js("new (window.AudioContext || window.webkitAudioContext)({sampleRate: 16000})")
            audioContext = context
            
            val workletPromise = context.audioWorklet.addModule("audio-processor.js") as Promise<dynamic>
            workletPromise.then {
                sourceNode = context.createMediaStreamSource(stream)
                
                workletNode = js("new AudioWorkletNode(context, 'audio-processor')")
                
                workletNode.port.onmessage = { event: MessageEvent ->
                    if (isRecording) {
                        val int16Array = event.data as Int16Array
                        val byteArray = ByteArray(int16Array.length * 2)
                        for (i in 0 until int16Array.length) {
                            val value = int16Array[i].toInt()
                            byteArray[i * 2] = (value and 0xFF).toByte()
                            byteArray[i * 2 + 1] = ((value shr 8) and 0xFF).toByte()
                        }
                        this.onAudioReady?.invoke(byteArray)
                    }
                }
                
                sourceNode.connect(workletNode)
                workletNode.connect(context.destination)
                
                null
            }.catch { e ->
                println("CRITICAL: Failed to load audio worklet. Ensure audio-processor.js is available: $e")
                stopRecording()
                null
            }
            null
        }.catch { e ->
            println("CRITICAL: Failed to get user media (microphone permission denied or unavailable): $e")
            stopRecording()
            null
        }
    }

    actual fun stopRecording() {
        isRecording = false
        this.onAudioReady = null
        
        try {
            workletNode?.disconnect()
            sourceNode?.disconnect()
            
            val tracks = mediaStream?.getTracks()
            if (tracks != null) {
                for (i in 0 until tracks.length as Int) {
                    tracks[i].stop()
                }
            }
            
            if (audioContext != null && audioContext.state != "closed") {
                audioContext.close()
            }
        } catch (e: Exception) {
            println("Error stopping recorder: $e")
        } finally {
            workletNode = null
            sourceNode = null
            mediaStream = null
            audioContext = null
        }
    }

    actual fun release() {
        stopRecording()
    }
}
