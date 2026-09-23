@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package audio

import kotlin.io.encoding.Base64

@JsFun(
    """
(onChunk, onError) => {
    globalThis.__spressoRecorder ??= { generation: 0, stream: null, context: null, source: null, node: null };
    const state = globalThis.__spressoRecorder;
    const generation = ++state.generation;
    if (!navigator.mediaDevices?.getUserMedia) {
        onError("Microphone access is not available in this browser.");
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
            if (generation !== state.generation) return;
            state.source = state.context.createMediaStreamSource(stream);
            state.node = new AudioWorkletNode(state.context, "audio-processor");
            state.node.port.onmessage = event => {
                if (generation !== state.generation) return;
                const samples = new Int8Array(event.data.buffer);
                let binary = "";
                for (let i = 0; i < samples.length; i++) binary += String.fromCharCode(samples[i] & 255);
                onChunk(btoa(binary));
            };
            state.source.connect(state.node);
            state.node.connect(state.context.destination);
            if (state.context.state === "suspended") state.context.resume();
        });
    }).catch(error => {
        if (generation === state.generation) onError(error?.message || "Microphone permission was denied.");
    });
}
""",
)
private external fun startWebAudioRecording(
    onChunk: (String) -> Unit,
    onError: (String) -> Unit,
)

@JsFun(
    """
() => {
    const state = globalThis.__spressoRecorder;
    if (!state) return;
    state.generation++;
    if (state.node) state.node.disconnect();
    if (state.source) state.source.disconnect();
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());
    if (state.context) state.context.close();
    state.stream = null;
    state.context = null;
    state.source = null;
    state.node = null;
}
""",
)
private external fun stopWebAudioRecording()

actual class AudioRecorder {
    actual var onAudioChunk: ((ByteArray) -> Unit)? = null
    actual var onError: ((Exception) -> Unit)? = null
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
        )
    }

    actual fun stopRecording() {
        recording = false
        stopWebAudioRecording()
        onAudioChunk = null
    }

    actual fun isRecording(): Boolean = recording
}
