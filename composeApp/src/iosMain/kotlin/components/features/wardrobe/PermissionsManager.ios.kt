package components.features.wardrobe

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import platform.Photos.PHAuthorizationStatusAuthorized
import platform.Photos.PHPhotoLibrary

class IosPermissionsManager : PermissionsManager {
    override fun checkGalleryPermission(): Boolean {
        val status = PHPhotoLibrary.authorizationStatus()
        return status == PHAuthorizationStatusAuthorized
    }
    
    override fun requestGalleryPermission(onResult: (Boolean) -> Unit) {
        val currentStatus = PHPhotoLibrary.authorizationStatus()
        if (currentStatus == PHAuthorizationStatusAuthorized) {
            onResult(true)
            return
        }
        
        PHPhotoLibrary.requestAuthorization { status ->
            onResult(status == PHAuthorizationStatusAuthorized)
        }
    }
}

@Composable
actual fun rememberPermissionsManager(): PermissionsManager {
    return remember { IosPermissionsManager() }
}
