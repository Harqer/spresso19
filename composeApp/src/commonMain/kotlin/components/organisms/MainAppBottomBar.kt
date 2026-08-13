package components.organisms

import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import components.molecules.defaultNavDestinations
import components.molecules.isSameDestinationGroup
import navigation.NavKey

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
                icon = { Icon(item.icon, contentDescription = item.label) }
            )
        }
    }
}
