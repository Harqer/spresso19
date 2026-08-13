package audio

expect class AudioPlayer() {
    fun playChunk(chunk: ByteArray)
    fun stop()
    fun release()
}
