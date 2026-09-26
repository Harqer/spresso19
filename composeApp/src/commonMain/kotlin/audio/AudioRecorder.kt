package audio

expect class AudioRecorder() {
    var onAudioChunk: ((ByteArray) -> Unit)?
    var onError: ((Exception) -> Unit)?
    var onStarted: (() -> Unit)?
    var onStopped: (() -> Unit)?

    fun startRecording()

    fun stopRecording()

    fun isRecording(): Boolean
}
