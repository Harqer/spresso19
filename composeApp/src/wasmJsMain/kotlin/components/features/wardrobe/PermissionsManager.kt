package components.features.wardrobe

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

@Composable
actual fun rememberPermissionsManager(): PermissionsManager {
    return remember {
        object : PermissionsManager {
            override fun checkGalleryPermission(): Boolean = true
            override fun requestGalleryPermission(onResult: (Boolean) -> Unit) {
                onResult(true)
            }
        }
    }
}
