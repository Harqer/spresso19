package ui

import androidx.compose.runtime.Composable

@Composable
expect fun rememberImagePicker(
    onFrameCaptured: ((ByteArray) -> Unit)? = null,
    onVisionContextCaptured: ((String) -> Unit)? = null,
    onImagePicked: (ByteArray?) -> Unit,
): () -> Unit
