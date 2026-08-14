package components.features.vision

import components.models.*

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SmartVisionHeader(
    hudText: String,
    onPickLensImage: () -> Unit,
    onPickTryOnImage: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Smart Vision & Virtual Try-On",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = hudText,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onPickLensImage,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = "Open Lens Camera Search")
                    Spacer(Modifier.width(6.dp))
                    Text("Live Lens Search", style = MaterialTheme.typography.labelMedium)
                }
                OutlinedButton(
                    onClick = onPickTryOnImage,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Icon(Icons.Default.Checkroom, contentDescription = "Virtual Try-On AI")
                    Spacer(Modifier.width(6.dp))
                    Text("Virtual Try-On", style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}
