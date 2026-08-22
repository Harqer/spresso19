package components.features.vision

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
actual fun LiveVisionCamera(
    onObjectDetected: (ByteArray, List<List<Float>>) -> Unit,
    modifier: Modifier,
) {
    // Stub for desktop
}
