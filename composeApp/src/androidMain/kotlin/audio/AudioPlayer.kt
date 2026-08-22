package audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack

actual class AudioPlayer {
    private var audioTrack: AudioTrack? = null
    private val sampleRate = 24000 // Configured for Gemini Live API 24kHz output
    private val channelConfig = AudioFormat.CHANNEL_OUT_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT

    init {
        try {
            val bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            audioTrack =
                AudioTrack
                    .Builder()
                    .setAudioAttributes(
                        AudioAttributes
                            .Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANT)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build(),
                    ).setAudioFormat(
                        AudioFormat
                            .Builder()
                            .setEncoding(audioFormat)
                            .setSampleRate(sampleRate)
                            .setChannelMask(channelConfig)
                            .build(),
                    ).setBufferSizeInBytes(bufferSize)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build()

            if (audioTrack?.state == AudioTrack.STATE_INITIALIZED) {
                audioTrack?.play()
            }
        } catch (e: Exception) {
            network.Telemetry.recordError("Failed to initialize AudioTrack", e)
            audioTrack = null
        }
    }

    actual fun playChunk(chunk: ByteArray) {
        try {
            if (audioTrack?.state == AudioTrack.STATE_INITIALIZED && audioTrack?.playState != AudioTrack.PLAYSTATE_STOPPED) {
                audioTrack?.write(chunk, 0, chunk.size)
            }
        } catch (e: Exception) {
            network.Telemetry.recordError("Error writing to AudioTrack", e)
        }
    }

    actual fun stop() {
        try {
            if (audioTrack?.state == AudioTrack.STATE_INITIALIZED && audioTrack?.playState != AudioTrack.PLAYSTATE_STOPPED) {
                audioTrack?.stop()
                audioTrack?.flush()
            }
        } catch (e: Exception) {
            network.Telemetry.recordError("Error stopping AudioTrack", e)
        }
    }

    actual fun release() {
        stop()
        try {
            audioTrack?.release()
        } catch (e: Exception) {
            network.Telemetry.recordError("Error releasing AudioTrack", e)
        } finally {
            audioTrack = null
        }
    }
}
