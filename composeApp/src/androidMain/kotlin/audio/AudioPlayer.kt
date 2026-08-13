package audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack

actual class AudioPlayer {
    private var audioTrack: AudioTrack? = null
    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_OUT_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    
    init {
        val bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(audioFormat)
                    .setSampleRate(sampleRate)
                    .setChannelMask(channelConfig)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
            
        audioTrack?.play()
    }
    
    actual fun playChunk(chunk: ByteArray) {
        audioTrack?.write(chunk, 0, chunk.size)
    }
    
    actual fun stop() {
        audioTrack?.stop()
        audioTrack?.flush()
    }
    
    actual fun release() {
        audioTrack?.release()
        audioTrack = null
    }
}
