package components.features.wardrobe

import androidx.compose.runtime.Composable

interface PermissionsManager {
    fun checkGalleryPermission(): Boolean

    fun requestGalleryPermission(onResult: (Boolean) -> Unit)
}

@Composable
expect fun rememberPermissionsManager(): PermissionsManager
