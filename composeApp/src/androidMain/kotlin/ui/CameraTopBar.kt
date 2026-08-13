package ui

import androidx.camera.core.ImageCapture
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.FlashAuto
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable
fun CameraTopBar(
    flashMode: Int,
    zoomRatio: Float,
    isFrontLens: Boolean,
    onToggleFlash: () -> Unit,
    onSelectZoom: (Float) -> Unit,
    onSwitchLens: () -> Unit,
    modifier: Modifier = Modifier
) {
    val flashDesc = when (flashMode) {
        ImageCapture.FLASH_MODE_ON -> "On"
        ImageCapture.FLASH_MODE_AUTO -> "Auto"
        else -> "Off"
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 40.dp, start = 16.dp, end = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onToggleFlash,
            modifier = Modifier
                .size(48.dp)
                .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                .semantics(mergeDescendants = true) {
                    contentDescription = "Flash mode: $flashDesc"
                }
        ) {
            Icon(
                imageVector = when (flashMode) {
                    ImageCapture.FLASH_MODE_ON -> Icons.Default.FlashOn
                    ImageCapture.FLASH_MODE_AUTO -> Icons.Default.FlashAuto
                    else -> Icons.Default.FlashOff
                },
                contentDescription = "Flash mode",
                tint = Color.White
            )
        }

        Row(
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            listOf(1.0f, 2.0f).forEach { ratio ->
                Surface(
                    onClick = { onSelectZoom(ratio) },
                    shape = CircleShape,
                    color = if (zoomRatio == ratio) Color.White.copy(alpha = 0.3f) else Color.Transparent,
                    modifier = Modifier
                        .padding(2.dp)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "Set zoom ${ratio.toInt()}x"
                        }
                ) {
                    Text(
                        text = "${ratio.toInt()}x",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }

        IconButton(
            onClick = onSwitchLens,
            modifier = Modifier
                .size(48.dp)
                .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                .semantics(mergeDescendants = true) {
                    contentDescription = "Switch camera lens to ${if (isFrontLens) "back" else "front"}"
                }
        ) {
            Icon(
                imageVector = Icons.Default.Cameraswitch,
                contentDescription = "Switch Lens",
                tint = Color.White
            )
        }
    }
}
