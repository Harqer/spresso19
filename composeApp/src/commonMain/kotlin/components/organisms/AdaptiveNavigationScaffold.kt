package components.organisms

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.PermanentNavigationDrawer
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.AdaptiveNavDrawerContent
import components.molecules.defaultNavDestinations
import components.molecules.isSameDestinationGroup
import navigation.NavKey

@Composable
fun AdaptiveNavigationScaffold(
    currentKey: NavKey,
    onNavigate: (NavKey) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (NavKey) -> Unit
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val width = maxWidth
        val isMedium = width in 600.dp..840.dp

        if (width > 840.dp) {
            PermanentNavigationDrawer(
                drawerContent = {
                    AdaptiveNavDrawerContent(
                        currentKey = currentKey,
                        onNavigate = onNavigate
                    )
                }
            ) {
                AdaptiveScaffoldBody(
                    currentKey = currentKey,
                    showBottomBar = false,
                    onNavigate = onNavigate,
                    isVoiceRecording = isVoiceRecording,
                    onToggleVoiceRecording = onToggleVoiceRecording,
                    isDarkTheme = isDarkTheme,
                    onToggleTheme = onToggleTheme,
                    content = content
                )
            }
        } else if (isMedium) {
            Row(modifier = Modifier.fillMaxSize()) {
                NavigationRail(
                    modifier = Modifier.fillMaxHeight(),
                    header = {
                        IconButton(onClick = {}, modifier = Modifier.padding(vertical = 8.dp)) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                ) {
                    defaultNavDestinations.forEach { item ->
                        val selected = isSameDestinationGroup(currentKey, item.key)
                        NavigationRailItem(
                            selected = selected,
                            onClick = { onNavigate(item.key) },
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) }
                        )
                    }
                }
                Box(modifier = Modifier.weight(1f).fillMaxHeight()) {
                    AdaptiveScaffoldBody(
                        currentKey = currentKey,
                        showBottomBar = false,
                        onNavigate = onNavigate,
                        isVoiceRecording = isVoiceRecording,
                        onToggleVoiceRecording = onToggleVoiceRecording,
                        isDarkTheme = isDarkTheme,
                        onToggleTheme = onToggleTheme,
                        content = content
                    )
                }
            }
        } else { // Compact (<600dp)
            AdaptiveScaffoldBody(
                currentKey = currentKey,
                showBottomBar = true,
                onNavigate = onNavigate,
                isVoiceRecording = isVoiceRecording,
                onToggleVoiceRecording = onToggleVoiceRecording,
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                content = content
            )
        }
    }
}
