package components.organisms

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.molecules.defaultNavDestinations
import components.molecules.isSameDestinationGroup
import navigation.NavKey

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdaptiveScaffoldBody(
    currentKey: NavKey,
    showBottomBar: Boolean,
    onNavigate: (NavKey) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (NavKey) -> Unit
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Spresso",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onToggleTheme) {
                        Icon(
                            imageVector = if (isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Toggle Light/Dark Theme"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        bottomBar = {
            if (showBottomBar) {
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
        },
        floatingActionButton = {
            if (currentKey is NavKey.ChatKey) {
                FloatingActionButton(onClick = onToggleVoiceRecording) {
                    if (isVoiceRecording) {
                        Icon(Icons.Default.Stop, contentDescription = "Stop voice recording")
                    } else {
                        Icon(Icons.Default.Mic, contentDescription = "Start voice recording")
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            AnimatedContent(
                targetState = currentKey,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "ScreenTransition"
            ) { targetKey ->
                content(targetKey)
            }
        }
    }
}
