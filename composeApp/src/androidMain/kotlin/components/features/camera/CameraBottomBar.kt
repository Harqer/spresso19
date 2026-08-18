package components.features.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Camera
import androidx.compose.foundation.border

@Composable
fun CameraBottomBar(
    activeMode: String,
    isRecording: Boolean,
    zoomRatio: Float,
    onModeSelected: (String) -> Unit,
    onSelectZoom: (Float) -> Unit,
    onGalleryClick: () -> Unit,
    onCapturePhoto: () -> Unit,
    onToggleRecordVideo: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {


        // Zoom Controls
        Row(
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.5f), shape = CircleShape)
                .padding(horizontal = 4.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            listOf(0.5f, 1.0f, 2.0f, 3.0f).forEach { ratio ->
                Surface(
                    onClick = { onSelectZoom(ratio) },
                    shape = CircleShape,
                    color = if (zoomRatio == ratio) MaterialTheme.colorScheme.primary else Color.Transparent,
                    modifier = Modifier
                        .padding(2.dp)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "Set zoom ${if (ratio == 0.5f) "0.5x" else "${ratio.toInt()}x"}"
                        }
                ) {
                    Text(
                        text = if (ratio == 0.5f) "0.5x" else "${ratio.toInt()}x",
                        color = if (zoomRatio == ratio) Color.Black else Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Cancel / Gallery
            IconButton(
                onClick = onGalleryClick,
                modifier = Modifier
                    .size(48.dp)
                    .background(Color.White.copy(alpha = 0.1f), shape = RoundedCornerShape(12.dp))
                    .semantics(mergeDescendants = true) {
                        contentDescription = "Cancel camera viewfinder"
                    }
            ) {
                Icon(
                    imageVector = Icons.Default.PhotoLibrary,
                    contentDescription = "Upload Photo",
                    tint = Color.White
                )
            }

            // Shutter
            IconButton(
                onClick = { if (activeMode == "VIDEO") onToggleRecordVideo() else onCapturePhoto() },
                modifier = Modifier
                    .size(80.dp)
                    .background(if (activeMode == "VIDEO") Color.Transparent else Color.White.copy(alpha = 0.05f), shape = CircleShape)
                    .semantics(mergeDescendants = true) {
                        contentDescription = if (activeMode == "VIDEO") {
                            if (isRecording) "Stop recording" else "Start recording"
                        } else "Capture photo shutter"
                    }
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Color.Transparent, shape = CircleShape)
                        .border(4.dp, MaterialTheme.colorScheme.primary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(if (isRecording) 32.dp else 64.dp)
                            .background(
                                color = if (activeMode == "VIDEO") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                                shape = if (isRecording) RoundedCornerShape(8.dp) else CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (activeMode != "VIDEO" && !isRecording) {
                            Icon(
                                imageVector = Icons.Default.Camera,
                                contentDescription = "Camera",
                                tint = Color.Black,
                                modifier = Modifier.size(30.dp)
                            )
                        }
                    }
                }
            }

            // Empty Spacer to balance row
            Spacer(modifier = Modifier.size(48.dp))
        }
    }
}
