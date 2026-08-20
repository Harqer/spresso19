package audio

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

actual class AudioRecorder {
    actual var onAudioChunk: ((ByteArray) -> Unit)? = null
    actual var onError: ((Exception) -> Unit)? = null
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingJob: Job? = null
    private val recorderJob = SupervisorJob()
    private val recorderScope = CoroutineScope(Dispatchers.IO + recorderJob)
    
    actual fun startRecording() {
        if (isRecording) return
        
        val sampleRate = 16000 // Gemini Live API input requires 16kHz PCM
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        
        if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
            throw IllegalStateException("Unsupported audio recording hardware buffer size.")
        }
        
        try {
            val record = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )
            
            if (record.state != AudioRecord.STATE_INITIALIZED) {
                try {
                    record.release()
                } catch (e: Exception) {
                    network.Telemetry.recordError("Error releasing uninitialized AudioRecord", e)
                }
                throw IllegalStateException("Failed to initialize AudioRecord instance.")
            }
            
            audioRecord = record
            record.startRecording()
            isRecording = true
            
            recordingJob = recorderScope.launch {
                val buffer = ShortArray(bufferSize)
                val noiseGateThreshold = 100 // Minimal amplitude to trigger transmission
                while (isActive && isRecording) {
                    val currentRecord = audioRecord
                    if (currentRecord == null || currentRecord.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                        break
                    }
                    
                    val readResult = currentRecord.read(buffer, 0, buffer.size)
                    if (readResult > 0) {
                        // Basic VAD / Noise Gate: only send if peak amplitude > threshold
                        var maxAmp = 0
                        for (i in 0 until readResult) {
                            val amp = Math.abs(buffer[i].toInt())
                            if (amp > maxAmp) maxAmp = amp
                        }
                        
                        if (maxAmp > noiseGateThreshold) {
                            val bytes = ByteArray(readResult * 2)
                            for (i in 0 until readResult) {
                                bytes[i * 2] = (buffer[i].toInt() and 0x00FF).toByte()
                                bytes[i * 2 + 1] = (buffer[i].toInt() shr 8).toByte()
                            }
                            onAudioChunk?.invoke(bytes)
                        }
                    } else if (readResult < 0) {
                        println("AudioRecord read error: $readResult")
                        break
                    }
                }
            }
        } catch (e: SecurityException) {
            isRecording = false
            try {
                audioRecord?.release()
            } catch (ex: Exception) {
                // Ignore during error tear down
            }
            audioRecord = null
            throw IllegalStateException("Microphone RECORD_AUDIO permission missing or denied.", e)
        } catch (e: Exception) {
            isRecording = false
            try {
                audioRecord?.release()
            } catch (ex: Exception) {
                // Ignore during error tear down
            }
            audioRecord = null
            network.Telemetry.recordError("Exception starting AudioRecord", e)
            throw e
        }
    }
    
    actual fun stopRecording() {
        if (!isRecording) return
        isRecording = false
        recordingJob?.cancel()
        recordingJob = null
        
        try {
            if (audioRecord?.state == AudioRecord.STATE_INITIALIZED && 
                audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                audioRecord?.stop()
            }
        } catch (e: Exception) {
            network.Telemetry.recordError("Error stopping AudioRecorder", e)
            throw e
        } finally {
            try {
                audioRecord?.release()
            } catch (e: Exception) {
                network.Telemetry.recordError("Error releasing AudioRecorder", e)
            }
            audioRecord = null
        }
    }
    
    actual fun isRecording(): Boolean = isRecording
}

