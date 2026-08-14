package components.navigation

import components.models.*



import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import components.core.LogoSize
import components.core.SpressoLogo
import components.navigation.defaultNavDestinations
import components.navigation.isSameDestinationGroup
import navigation.NavKey
import org.jetbrains.compose.resources.vectorResource
import theme.ThemeMode
import components.features.chat.AIShopperInputBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdaptiveScaffoldBody(
    currentKey: NavKey,
    showBottomBar: Boolean,
    onNavigate: (NavKey) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
    onToggleDrawer: () -> Unit = {},
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    content: @Composable (NavKey) -> Unit
) {
    val isDark = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onToggleDrawer) {
                            SpressoLogo(size = LogoSize.Small, showText = false)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Spresso",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val nextMode = when (themeMode) {
                            ThemeMode.SYSTEM -> if (isDark) ThemeMode.LIGHT else ThemeMode.DARK
                            ThemeMode.LIGHT -> ThemeMode.DARK
                            ThemeMode.DARK -> ThemeMode.SYSTEM
                        }
                        onThemeModeChange(nextMode)
                    }) {
                        Icon(
                            imageVector = when (themeMode) {
                                ThemeMode.LIGHT -> Icons.Default.LightMode
                                ThemeMode.DARK -> Icons.Default.DarkMode
                                ThemeMode.SYSTEM -> Icons.Default.AutoAwesome
                            },
                            contentDescription = "Switch Theme Mode"
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
                AIShopperInputBar(
                    onSend = onAskAI,
                    isVoiceActive = isVoiceRecording,
                    onToggleVoice = onToggleVoiceRecording,
                    placeholder = "Ask Spresso...",
                    modifier = Modifier
                )
            }
        },
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
