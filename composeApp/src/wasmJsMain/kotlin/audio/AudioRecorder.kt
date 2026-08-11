package audio

import org.khronos.webgl.Int8Array

actual class AudioRecorder {
    private var isRecording = false
    actual var onAudioChunk: ((ByteArray) -> Unit)? = null
    
    actual fun startRecording() {
        if (isRecording) return
        isRecording = true
        requestMicrophoneAccess { intArray ->
            val bytes = ByteArray(intArray.length)
            for (i in 0 until intArray.length) {
                bytes[i] = getInt8ArrayElement(intArray, i)
            }
            onAudioChunk?.invoke(bytes)
        }
    }
    
    actual fun stopRecording() {
        if (!isRecording) return
        isRecording = false
        stopMicrophoneAccess()
    }
    
    actual fun isRecording(): Boolean = isRecording
}

@JsFun("(array, index) => array[index]")
internal external fun getInt8ArrayElement(array: Int8Array, index: Int): Byte

@JsFun("""
function(callback) {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            window.audioStream = stream;
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 16000});
            window.audioSource = window.audioContext.createMediaStreamSource(stream);
            window.processor = window.audioContext.createScriptProcessor(4096, 1, 1);
            
            window.processor.onaudioprocess = function(e) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                const bytes = new Int8Array(pcm16.buffer);
                callback(bytes);
            };
            window.audioSource.connect(window.processor);
            window.processor.connect(window.audioContext.destination);
        })
        .catch(err => {
            // crashlytics will handle native logging on production
        });
}
""")
internal external fun requestMicrophoneAccess(callback: (Int8Array) -> Unit)

@JsFun("""
function() {
    if (window.processor) {
        window.processor.disconnect();
        window.processor = null;
    }
    if (window.audioSource) {
        window.audioSource.disconnect();
        window.audioSource = null;
    }
    if (window.audioContext) {
        window.audioContext.close();
        window.audioContext = null;
    }
    if (window.audioStream) {
        window.audioStream.getTracks().forEach(track => track.stop());
        window.audioStream = null;
    }
}
""")
internal external fun stopMicrophoneAccess()
