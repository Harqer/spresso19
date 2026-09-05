package audio

/** Explicitly unavailable until the Kotlin/Wasm Web Audio bridge is ready. */
actual class AudioPlayer {
    actual fun playChunk(chunk: ByteArray) = Unit
    actual fun stop() = Unit
    actual fun release() = Unit
}
