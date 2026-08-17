package ui

import androidx.compose.runtime.Composable

@JsFun("""
() => {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        return new SpeechRecognition();
    }
    return null;
}
""")
external fun createSpeechRecognition(): JsAny?

@JsFun("""
(recognition, lang, onResult, onError) => {
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        onResult(transcript);
    };
    recognition.onerror = function(event) {
        onError("Speech recognition error: " + event.error);
    };
    recognition.start();
}
""")
external fun startSpeechRecognitionInterop(
    recognition: JsAny, 
    lang: String, 
    onResult: (String) -> Unit, 
    onError: (String) -> Unit
)

@Composable
actual fun rememberSpeechRecognizer(
    onResult: (String) -> Unit,
    onError: (String) -> Unit
): () -> Unit {
    return {
        val recognition = createSpeechRecognition()
        if (recognition != null) {
            startSpeechRecognitionInterop(recognition, "en-US", onResult, onError)
        } else {
            onError("Web Speech API not supported in this browser.")
        }
    }
}
