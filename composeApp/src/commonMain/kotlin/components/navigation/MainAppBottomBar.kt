package components.navigation

import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import components.navigation.defaultNavDestinations
import components.navigation.isSameDestinationGroup
import navigation.NavKey
import org.jetbrains.compose.resources.vectorResource

@Composable
fun MainAppBottomBar(
    currentKey: NavKey,
    onNavigate: (NavKey) -> Unit
) {
    NavigationBar {
        defaultNavDestinations.take(5).forEach { item ->
            val selected = isSameDestinationGroup(currentKey, item.key)
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.key) },
                label = { Text(item.label) },
                icon = {
                    if (item.icon != null) {
                        Icon(item.icon, contentDescription = item.label)
                    } else if (item.iconResource != null) {
                        Icon(vectorResource(item.iconResource), contentDescription = item.label)
                    }
                }
            )
        }
    }
}
