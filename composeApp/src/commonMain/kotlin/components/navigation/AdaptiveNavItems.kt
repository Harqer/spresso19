package components.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.FlightTakeoff
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.LocalGroceryStore
import androidx.compose.material.icons.filled.Recommend
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material.icons.outlined.FlightTakeoff
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.LocalGroceryStore
import androidx.compose.material.icons.outlined.Recommend
import androidx.compose.ui.graphics.vector.ImageVector
import navigation.NavKey

data class NavDestinationItem(
    val key: NavKey,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector,
)

val defaultNavDestinations =
    listOf(
        NavDestinationItem(NavKey.ChatKey(), "Chat", icon = Icons.Outlined.Forum, selectedIcon = Icons.Filled.Forum),
        NavDestinationItem(NavKey.CreatorKey(), "Creator", icon = Icons.Outlined.AutoAwesome, selectedIcon = Icons.Filled.AutoAwesome),
        NavDestinationItem(
            NavKey.TravelKey,
            "Travel & Expenses",
            icon = Icons.Outlined.FlightTakeoff,
            selectedIcon = Icons.Filled.FlightTakeoff,
        ),
        NavDestinationItem(NavKey.CatalogKey, "For You", icon = Icons.Outlined.Recommend, selectedIcon = Icons.Filled.Recommend),
        NavDestinationItem(NavKey.WardrobeKey(), "Wardrobe", icon = Icons.Outlined.Checkroom, selectedIcon = Icons.Filled.Checkroom),
        NavDestinationItem(
            NavKey.OrdersKey,
            "Orders",
            icon = Icons.AutoMirrored.Outlined.ReceiptLong,
            selectedIcon = Icons.AutoMirrored.Filled.ReceiptLong,
        ),
        NavDestinationItem(
            NavKey.GroceryKey,
            "Grocery",
            icon = Icons.Outlined.LocalGroceryStore,
            selectedIcon = Icons.Filled.LocalGroceryStore,
        ),
    )

fun isSameDestinationGroup(
    current: NavKey,
    target: NavKey,
): Boolean = current::class == target::class
