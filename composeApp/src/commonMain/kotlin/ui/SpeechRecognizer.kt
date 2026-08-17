package ui

import androidx.compose.runtime.Composable

@Composable
expect fun rememberSpeechRecognizer(
    onResult: (String) -> Unit,
    onError: (String) -> Unit
): () -> Unit
