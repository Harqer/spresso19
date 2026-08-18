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
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingJob: Job? = null
    private val recorderJob = SupervisorJob()
    private val recorderScope = CoroutineScope(Dispatchers.IO + recorderJob)
    
    actual fun startRecording() {
        if (isRecording) return
        
        val sampleRate = 16000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        
        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )
            
            audioRecord?.startRecording()
            isRecording = true
            
            recordingJob = recorderScope.launch {
                val buffer = ShortArray(bufferSize)
                while (isActive && isRecording) {
                    val readResult = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (readResult > 0) {
                        val bytes = ByteArray(readResult * 2)
                        for (i in 0 until readResult) {
                            bytes[i * 2] = (buffer[i].toInt() and 0x00FF).toByte()
                            bytes[i * 2 + 1] = (buffer[i].toInt() shr 8).toByte()
                        }
                        onAudioChunk?.invoke(bytes)
                    }
                }
            }
        } catch (e: SecurityException) {
            isRecording = false
        }
    }
    
    actual fun stopRecording() {
        if (!isRecording) return
        isRecording = false
        recordingJob?.cancel()
        recordingJob = null
        recorderJob.children.forEach { it.cancel() }
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
    
    actual fun isRecording(): Boolean = isRecording
}
