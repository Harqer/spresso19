package ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable
fun CameraBottomBar(
    activeMode: String,
    onModeSelected: (String) -> Unit,
    onDismiss: () -> Unit,
    onCapturePhoto: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            listOf("PHOTO", "VIDEO", "VIRTUAL FIT").forEach { mode ->
                TextButton(
                    onClick = { onModeSelected(mode) },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = if (activeMode == mode) Color(0xFF10B981) else Color.LightGray
                    ),
                    modifier = Modifier.semantics(mergeDescendants = true) {
                        contentDescription = "Select $mode camera mode"
                    }
                ) {
                    Text(text = mode, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                modifier = Modifier.semantics(mergeDescendants = true) {
                    contentDescription = "Cancel camera viewfinder"
                }
            ) {
                Text("Cancel", color = Color.White)
            }

            IconButton(
                onClick = onCapturePhoto,
                modifier = Modifier
                    .size(80.dp)
                    .background(Color.White.copy(alpha = 0.9f), shape = CircleShape)
                    .semantics(mergeDescendants = true) {
                        contentDescription = "Capture photo shutter"
                    }
            ) {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .background(Color.Transparent, shape = CircleShape)
                        .padding(4.dp)
                        .background(Color.White, shape = CircleShape)
                )
            }
        }
    }
}
