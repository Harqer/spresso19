package audio

expect class AudioRecorder() {
    var onAudioChunk: ((ByteArray) -> Unit)?
    var onError: ((Exception) -> Unit)?

    fun startRecording()

    fun stopRecording()

    fun isRecording(): Boolean
}
