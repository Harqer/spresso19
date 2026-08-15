package components.navigation

import components.models.*

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector
import navigation.NavKey
import org.jetbrains.compose.resources.DrawableResource
import spresso.composeapp.generated.resources.Res
import spresso.composeapp.generated.resources.ic_for_you
import spresso.composeapp.generated.resources.ic_deployed_code_account

data class NavDestinationItem(
    val key: NavKey,
    val label: String,
    val icon: ImageVector? = null,
    val iconResource: DrawableResource? = null
)

val defaultNavDestinations = listOf(
    NavDestinationItem(NavKey.ChatKey(), "Chat", icon = Icons.Outlined.Forum),
    NavDestinationItem(NavKey.CreatorKey(), "Creator", iconResource = Res.drawable.ic_deployed_code_account),
    NavDestinationItem(NavKey.TravelKey, "Travel & Expenses", icon = Icons.Outlined.FlightTakeoff),
    NavDestinationItem(NavKey.CatalogKey, "For You", iconResource = Res.drawable.ic_for_you),
    NavDestinationItem(NavKey.WardrobeKey(), "Wardrobe", icon = Icons.Outlined.Checkroom),
    NavDestinationItem(NavKey.OrdersKey, "Orders", icon = Icons.AutoMirrored.Outlined.ReceiptLong),
    NavDestinationItem(NavKey.GroceryKey, "Grocery", icon = Icons.Outlined.LocalGroceryStore),
    NavDestinationItem(NavKey.ProfileKey, "Profile", icon = Icons.Outlined.AccountBox)
)

fun isSameDestinationGroup(current: NavKey, target: NavKey): Boolean {
    return current::class == target::class
}
