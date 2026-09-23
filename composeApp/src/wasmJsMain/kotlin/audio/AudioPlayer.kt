@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package audio

import kotlin.io.encoding.Base64

@JsFun(
    """
(base64) => {
    globalThis.__spressoAudio ??= { context: null, nextTime: 0, sources: [] };
    const state = globalThis.__spressoAudio;
    state.context ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const context = state.context;
    if (context.state === "suspended") context.resume();

    const binary = atob(base64);
    const sampleCount = Math.floor(binary.length / 2);
    const buffer = context.createBuffer(1, sampleCount, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
        const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
        const signed = value > 32767 ? value - 65536 : value;
        channel[i] = signed / 32768;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const start = Math.max(context.currentTime, state.nextTime);
    source.start(start);
    state.nextTime = start + buffer.duration;
    state.sources.push(source);
    source.onended = () => {
        state.sources = state.sources.filter(candidate => candidate !== source);
    };
}
""",
)
private external fun playPcmBase64(base64: String)

@JsFun(
    """
() => {
    const state = globalThis.__spressoAudio;
    if (!state) return;
    for (const source of state.sources) {
        try { source.stop(); } catch (_) {}
    }
    state.sources = [];
    if (state.context) state.nextTime = state.context.currentTime;
}
""",
)
private external fun stopPcmPlayback()

@JsFun(
    """
() => {
    const state = globalThis.__spressoAudio;
    if (!state) return;
    for (const source of state.sources) {
        try { source.stop(); } catch (_) {}
    }
    state.sources = [];
    if (state.context) {
        state.context.close();
        state.context = null;
        state.nextTime = 0;
    }
}
""",
)
private external fun releasePcmPlayback()

actual class AudioPlayer {
    actual fun playChunk(chunk: ByteArray) {
        if (chunk.isEmpty()) return
        playPcmBase64(Base64.Default.encode(chunk))
    }

    actual fun stop() {
        stopPcmPlayback()
    }

    actual fun release() {
        releasePcmPlayback()
    }
}
