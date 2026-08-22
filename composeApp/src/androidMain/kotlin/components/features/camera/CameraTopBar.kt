package components.features.camera

import androidx.camera.core.ImageCapture
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashAuto
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Grid3x3
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
    showGrid: Boolean,
    isFrontLens: Boolean,
    onClose: () -> Unit,
    onToggleFlash: () -> Unit,
    onToggleGrid: () -> Unit,
    onSwitchLens: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val flashDesc =
        when (flashMode) {
            ImageCapture.FLASH_MODE_ON -> "On"
            ImageCapture.FLASH_MODE_AUTO -> "Auto"
            else -> "Off"
        }

    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.3f))
                .padding(top = 40.dp, bottom = 16.dp, start = 16.dp, end = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Left: Close Button
        IconButton(
            onClick = onClose,
            modifier =
                Modifier
                    .size(40.dp)
                    .background(Color.White.copy(alpha = 0.15f), shape = CircleShape),
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Close Camera",
                tint = Color.White,
            )
        }

        // Right: Pro Controls
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onToggleFlash,
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "Flash mode: $flashDesc"
                        },
            ) {
                Icon(
                    imageVector =
                        when (flashMode) {
                            ImageCapture.FLASH_MODE_ON -> Icons.Default.FlashOn
                            ImageCapture.FLASH_MODE_AUTO -> Icons.Default.FlashAuto
                            else -> Icons.Default.FlashOff
                        },
                    contentDescription = "Flash mode",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }

            IconButton(
                onClick = onToggleGrid,
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(
                            if (showGrid) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else Color.Black.copy(alpha = 0.6f),
                            shape = CircleShape,
                        ).semantics(mergeDescendants = true) {
                            contentDescription = "Toggle Grid"
                        },
            ) {
                Icon(
                    imageVector = Icons.Default.Grid3x3,
                    contentDescription = "Toggle Grid",
                    tint = if (showGrid) MaterialTheme.colorScheme.primary else Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }

            IconButton(
                onClick = onSwitchLens,
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(Color.Black.copy(alpha = 0.6f), shape = CircleShape)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "Switch camera lens to ${if (isFrontLens) "back" else "front"}"
                        },
            ) {
                Icon(
                    imageVector = Icons.Default.Cameraswitch,
                    contentDescription = "Switch Lens",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
