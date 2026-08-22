package audio

import org.khronos.webgl.Float32Array
import org.khronos.webgl.Int16Array

actual class AudioPlayer {
    private var isPlaying = false
    private var audioContext: dynamic = null
    private var nextAudioStartTime: Double = 0.0

    actual fun playChunk(chunk: ByteArray) {
        if (!isPlaying) {
            isPlaying = true
            initAudioContext()
        }

        val context = audioContext ?: return
        if (context.state == "suspended") {
            context.resume()
        }

        // Convert PCM 16-bit to Float32
        val int16Array = Int16Array(chunk.size / 2)
        for (i in 0 until int16Array.length) {
            val byte1 = chunk[i * 2].toInt() and 0xFF
            val byte2 = chunk[i * 2 + 1].toInt() shl 8
            int16Array[i] = (byte1 or byte2).toShort()
        }

        val float32Array = Float32Array(int16Array.length)
        for (i in 0 until int16Array.length) {
            float32Array[i] = int16Array[i].toFloat() / 32768.0f
        }

        try {
            val buffer = context.createBuffer(1, float32Array.length, 24000)
            buffer.getChannelData(0).set(float32Array)

            val source = context.createBufferSource()
            source.buffer = buffer
            source.connect(context.destination)

            // Gapless scheduling using local state instead of window global
            val currentTime = context.currentTime as Double
            val startTime = if (nextAudioStartTime < currentTime) currentTime else nextAudioStartTime

            source.start(startTime)
            nextAudioStartTime = startTime + buffer.duration
        } catch (e: Exception) {
            println("Error scheduling audio chunk: $e")
        }
    }

    private fun initAudioContext() {
        if (audioContext == null) {
            try {
                audioContext = js("new (window.AudioContext || window.webkitAudioContext)({sampleRate: 24000})")
                nextAudioStartTime = 0.0
            } catch (e: Exception) {
                println("Failed to initialize AudioContext: $e")
            }
        }
    }

    actual fun stop() {
        isPlaying = false
        try {
            if (audioContext != null && audioContext.state != "closed") {
                audioContext.close()
            }
        } catch (e: Exception) {
            println("Error closing AudioContext: $e")
        } finally {
            audioContext = null
            nextAudioStartTime = 0.0
        }
    }

    actual fun release() {
        stop()
    }
}
