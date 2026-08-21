package components.features.vision

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.material3.Text
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Alignment

@Composable
actual fun LiveVisionCamera(
    onObjectDetected: (ByteArray, List<List<Float>>) -> Unit,
    modifier: Modifier
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Text("Camera integration coming soon for iOS.")
    }
}
