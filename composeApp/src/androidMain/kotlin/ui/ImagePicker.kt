package ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun rememberImagePicker(
    onFrameCaptured: ((ByteArray) -> Unit)?,
    onImagePicked: (ByteArray?) -> Unit
): () -> Unit {
    val context = LocalContext.current
    var showDialog by remember { mutableStateOf(false) }
    var showCamera by remember { mutableStateOf(false) }
    
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            onImagePicked(bytes)
        } else {
            onImagePicked(null)
        }
    }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            showCamera = true
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Choose Media Source") },
            text = { Text("Capture a new photo from camera or choose an existing photo from the gallery.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDialog = false
                        val isGranted = androidx.core.content.ContextCompat.checkSelfPermission(
                            context,
                            android.Manifest.permission.CAMERA
                        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                        if (isGranted) {
                            showCamera = true
                        } else {
                            permissionLauncher.launch(android.Manifest.permission.CAMERA)
                        }
                    }
                ) {
                    Text("Camera")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDialog = false
                        galleryLauncher.launch(androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    }
                ) {
                    Text("Gallery")
                }
            }
        )
    }

    if (showCamera) {
        androidx.compose.ui.window.Dialog(
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
            onDismissRequest = { showCamera = false }
        ) {
            CameraCaptureView(
                onImageCaptured = { bytes ->
                    showCamera = false
                    onImagePicked(bytes)
                },
                onFrameCaptured = onFrameCaptured,
                onDismiss = {
                    showCamera = false
                    onImagePicked(null)
                }
            )
        }
    }
    
    return {
        showDialog = true
    }
}
