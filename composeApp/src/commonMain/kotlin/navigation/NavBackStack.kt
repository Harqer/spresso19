package navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.snapshots.SnapshotStateList

/**
 * Navigation 3 State-Preserving Saveable BackStack implementation.
 */
class NavBackStack(initialKey: NavKey) {
    val entries: SnapshotStateList<NavKey> = mutableStateListOf(initialKey)

    val currentKey: NavKey
        get() = entries.lastOrNull() ?: NavKey.ChatKey()

    fun push(key: NavKey) {
        if (entries.lastOrNull() != key) {
            entries.add(key)
        }
    }

    fun pop(): Boolean {
        if (entries.size > 1) {
            entries.removeAt(entries.lastIndex)
            return true
        }
        return false
    }

    fun replace(key: NavKey) {
        if (entries.isNotEmpty()) {
            entries[entries.lastIndex] = key
        } else {
            entries.add(key)
        }
    }

    fun switchTab(key: NavKey) {
        val existingIndex = entries.indexOfFirst { it::class == key::class }
        if (existingIndex != -1) {
            while (entries.size > existingIndex + 1) {
                entries.removeAt(entries.lastIndex)
            }
            entries[existingIndex] = key
        } else {
            entries.add(key)
        }
    }

    companion object {
        fun saver(): Saver<NavBackStack, List<String>> = Saver(
            save = { backStack ->
                backStack.entries.map { serializeNavKey(it) }
            },
            restore = { savedList ->
                val stack = NavBackStack(NavKey.ChatKey())
                stack.entries.clear()
                savedList.forEach { str ->
                    deserializeNavKey(str)?.let { stack.entries.add(it) }
                }
                if (stack.entries.isEmpty()) {
                    stack.entries.add(NavKey.ChatKey())
                }
                stack
            }
        )
    }
}

private fun serializeNavKey(key: NavKey): String {
    return when (key) {
        is NavKey.AuthKey -> "Auth"
        is NavKey.ChatKey -> "Chat:${key.initialPrompt.orEmpty()}:${key.initialImage.orEmpty()}"
        is NavKey.CatalogKey -> "Catalog"
        is NavKey.SmartVisionKey -> "SmartVision:${key.selectedProductId.orEmpty()}"
        is NavKey.GroceryKey -> "Grocery"
        is NavKey.OrdersKey -> "Orders"
        is NavKey.CreatorKey -> "Creator:${key.selectedTemplateId}"
        is NavKey.WardrobeKey -> "Wardrobe:${key.displayMediaUrl.orEmpty()}:${key.isVideoPlaying}"
        is NavKey.ProfileKey -> "Profile"
    }
}

private fun deserializeNavKey(str: String): NavKey? {
    val parts = str.split(":")
    return when (parts.getOrNull(0)) {
        "Auth" -> NavKey.AuthKey
        "Chat" -> NavKey.ChatKey(
            initialPrompt = parts.getOrNull(1)?.ifEmpty { null },
            initialImage = parts.getOrNull(2)?.ifEmpty { null }
        )
        "Catalog" -> NavKey.CatalogKey
        "SmartVision" -> NavKey.SmartVisionKey(
            selectedProductId = parts.getOrNull(1)?.ifEmpty { null }
        )
        "Grocery" -> NavKey.GroceryKey
        "Orders" -> NavKey.OrdersKey
        "Creator" -> NavKey.CreatorKey(
            selectedTemplateId = parts.getOrNull(1) ?: "economic"
        )
        "Wardrobe" -> NavKey.WardrobeKey(
            displayMediaUrl = parts.getOrNull(1)?.ifEmpty { null },
            isVideoPlaying = parts.getOrNull(2)?.toBooleanStrictOrNull() ?: false
        )
        "Profile" -> NavKey.ProfileKey
        else -> null
    }
}

@Composable
fun rememberSaveableNavBackStack(initialKey: NavKey): NavBackStack {
    return rememberSaveable(saver = NavBackStack.saver()) {
        NavBackStack(initialKey)
    }
}
