package audio

expect class AudioRecorder() {
    var onAudioChunk: ((ByteArray) -> Unit)?
    fun startRecording()
    fun stopRecording()
    fun isRecording(): Boolean
}
