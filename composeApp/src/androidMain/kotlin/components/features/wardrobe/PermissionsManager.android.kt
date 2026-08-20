package components.features.wardrobe

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

class AndroidPermissionsManager(
    private val checkPermission: () -> Boolean,
    private val requestPermission: ((Boolean) -> Unit) -> Unit
) : PermissionsManager {
    override fun checkGalleryPermission(): Boolean = checkPermission()
    
    override fun requestGalleryPermission(onResult: (Boolean) -> Unit) {
        requestPermission(onResult)
    }
}

@Composable
actual fun rememberPermissionsManager(): PermissionsManager {
    val context = LocalContext.current
    val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        Manifest.permission.READ_MEDIA_IMAGES
    } else {
        Manifest.permission.READ_EXTERNAL_STORAGE
    }
    
    // We need to keep track of the callback because the launcher needs it
    var pendingCallback: ((Boolean) -> Unit)? = remember { null }
    
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        pendingCallback?.invoke(isGranted)
        pendingCallback = null
    }

    return remember(context, launcher) {
        AndroidPermissionsManager(
            checkPermission = {
                ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
            },
            requestPermission = { callback ->
                if (ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED) {
                    callback(true)
                } else {
                    pendingCallback = callback
                    launcher.launch(permission)
                }
            }
        )
    }
}
