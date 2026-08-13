package components.molecules

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.ui.graphics.vector.ImageVector
import navigation.NavKey

data class NavDestinationItem(
    val key: NavKey,
    val label: String,
    val icon: ImageVector
)

val defaultNavDestinations = listOf(
    NavDestinationItem(NavKey.ChatKey(), "Assistant", Icons.AutoMirrored.Filled.Chat),
    NavDestinationItem(NavKey.CatalogKey, "Shop", Icons.Default.ShoppingBag),
    NavDestinationItem(NavKey.GroceryKey, "Groceries", Icons.Default.ShoppingCart),
    NavDestinationItem(NavKey.WardrobeKey(), "Wardrobe", Icons.Default.Checkroom),
    NavDestinationItem(NavKey.SmartVisionKey(), "Vision", Icons.Default.CameraAlt),
    NavDestinationItem(NavKey.OrdersKey, "Orders", Icons.Default.ReceiptLong),
    NavDestinationItem(NavKey.CreatorKey(), "Agents", Icons.Default.Group),
    NavDestinationItem(NavKey.ProfileKey, "Profile", Icons.Default.Person)
)

fun isSameDestinationGroup(current: NavKey, target: NavKey): Boolean {
    return current::class == target::class
}
