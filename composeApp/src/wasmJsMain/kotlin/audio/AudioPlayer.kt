package audio

actual class AudioPlayer {
    actual fun playChunk(chunk: ByteArray) {}
    actual fun stop() {}
    actual fun release() {}
}
