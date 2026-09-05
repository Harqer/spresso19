package audio

/** Explicitly unavailable until a Kotlin/Wasm-safe Web Audio bridge is ready. */
actual class AudioRecorder {
    actual var onAudioChunk: ((ByteArray) -> Unit)? = null
    actual var onError: ((Exception) -> Unit)? = null
    private var recording = false

    actual fun startRecording() {
        recording = false
        onError?.invoke(UnsupportedOperationException("Audio recording is not available in this browser build."))
    }

    actual fun stopRecording() {
        recording = false
        onAudioChunk = null
    }

    actual fun isRecording(): Boolean = recording
}
