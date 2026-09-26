@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package audio

import kotlin.io.encoding.Base64

@JsFun(
    """
(onChunk, onError, onStarted, onStopped) => {
    globalThis.__spressoRecorder ??= { generation: 0, stream: null, context: null, source: null, node: null, onChunk: null, onError: null, onStarted: null, onStopped: null };
    const state = globalThis.__spressoRecorder;
    const generation = ++state.generation;
    state.onChunk = onChunk;
    state.onError = onError;
    state.onStarted = onStarted;
    state.onStopped = onStopped;
    if (!navigator.mediaDevices?.getUserMedia) {
        const reportError = state.onError;
        const reportStopped = state.onStopped;
        state.onChunk = null;
        state.onError = null;
        state.onStarted = null;
        state.onStopped = null;
        reportStopped?.();
        reportError?.("Microphone access is not available in this browser.");
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        if (generation !== state.generation) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }
        state.stream = stream;
        state.context = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
        return state.context.audioWorklet.addModule("/audio-processor.js").then(() => {
            if (generation !== state.generation) {
                state.context?.close();
                return;
            }
            state.source = state.context.createMediaStreamSource(stream);
            state.node = new AudioWorkletNode(state.context, "audio-processor");
            state.node.port.onmessage = event => {
                if (generation !== state.generation || state.context?.state !== "running") return;
                const samples = new Int8Array(event.data.buffer);
                let binary = "";
                for (let i = 0; i < samples.length; i++) binary += String.fromCharCode(samples[i] & 255);
                state.onChunk?.(btoa(binary));
            };
            state.source.connect(state.node);
            state.node.connect(state.context.destination);
            if (state.context.state === "suspended") {
                return state.context.resume().then(() => {
                    if (generation !== state.generation) return;
                    if (state.context.state !== "running") throw new Error("Microphone audio could not be started.");
                    state.onStarted?.();
                });
            }
            if (state.context.state !== "running") throw new Error("Microphone audio could not be started.");
            state.onStarted?.();
        });
    }).catch(error => {
        if (generation !== state.generation) return;
        const onError = state.onError;
        const onStopped = state.onStopped;
        if (state.node) state.node.disconnect();
        if (state.source) state.source.disconnect();
        if (state.stream) state.stream.getTracks().forEach(track => track.stop());
        if (state.context) state.context.close();
        state.stream = null;
        state.context = null;
        state.source = null;
        state.node = null;
        state.onChunk = null;
        state.onError = null;
        state.onStarted = null;
        state.onStopped = null;
        onStopped?.();
        onError?.(error?.message || "Microphone permission was denied.");
    });
}
""",
)
private external fun startWebAudioRecording(
    onChunk: (String) -> Unit,
    onError: (String) -> Unit,
    onStarted: () -> Unit,
    onStopped: () -> Unit,
)

@JsFun(
    """
() => {
    const state = globalThis.__spressoRecorder;
    if (!state) return;
    const onStopped = state.onStopped;
    state.generation++;
    if (state.node) state.node.disconnect();
    if (state.source) state.source.disconnect();
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());
    if (state.context) state.context.close();
    state.stream = null;
    state.context = null;
    state.source = null;
    state.node = null;
    state.onChunk = null;
    state.onError = null;
    state.onStarted = null;
    state.onStopped = null;
    onStopped?.();
}
""",
)
private external fun stopWebAudioRecording()

actual class AudioRecorder {
    actual var onAudioChunk: ((ByteArray) -> Unit)? = null
    actual var onError: ((Exception) -> Unit)? = null
    actual var onStarted: (() -> Unit)? = null
    actual var onStopped: (() -> Unit)? = null
    private var recording = false

    actual fun startRecording() {
        if (recording) return
        recording = true
        startWebAudioRecording(
            onChunk = { encoded ->
                if (recording) onAudioChunk?.invoke(Base64.Default.decode(encoded))
            },
            onError = { message ->
                recording = false
                onError?.invoke(IllegalStateException(message))
            },
            onStarted = {
                if (recording) onStarted?.invoke()
            },
            onStopped = {
                recording = false
                onStopped?.invoke()
            },
        )
    }

    actual fun stopRecording() {
        recording = false
        stopWebAudioRecording()
        onAudioChunk = null
        onStarted = null
        onStopped = null
    }

    actual fun isRecording(): Boolean = recording
}
