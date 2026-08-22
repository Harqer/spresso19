package components.features.camera

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable
fun CameraPermissionDialog(
    onRequestPermission: () -> Unit,
    onOpenSettings: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Camera Access Required") },
        text = {
            Text(
                "Spresso requires camera permission to capture photos for Virtual Try-On and visual product search. Please allow camera access to continue.",
            )
        },
        confirmButton = {
            Button(
                onClick = onRequestPermission,
                modifier =
                    Modifier.semantics(mergeDescendants = true) {
                        contentDescription = "Allow camera permission"
                    },
            ) {
                Text("Allow Camera")
            }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(
                    onClick = onOpenSettings,
                    modifier =
                        Modifier.semantics(mergeDescendants = true) {
                            contentDescription = "Open app settings for permissions"
                        },
                ) {
                    Text("Open Settings")
                }
                TextButton(
                    onClick = onDismiss,
                    modifier =
                        Modifier.semantics(mergeDescendants = true) {
                            contentDescription = "Cancel camera permission request"
                        },
                ) {
                    Text("Cancel")
                }
            }
        },
    )
}
