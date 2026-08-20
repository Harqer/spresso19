package components.navigation

import androidx.compose.foundation.isSystemInDarkTheme

import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffoldDefaults
import navigation.NavigationState
import navigation.Navigator
import androidx.navigation3.runtime.NavEntry
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

import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteType
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdaptiveScaffoldBody(
    navigationState: NavigationState,
    navigator: Navigator,
    showBottomBar: Boolean,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    modifier: Modifier = Modifier,
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    onThemeModeChange: (ThemeMode) -> Unit = {},
    onToggleDrawer: () -> Unit = {},
    onAskAI: (String) -> Unit = {},
    entryProvider: (NavKey) -> NavEntry<NavKey>
) {
    val isDark = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }

    var isNavBarVisible by remember { mutableStateOf(showBottomBar) }

    LaunchedEffect(showBottomBar) {
        isNavBarVisible = showBottomBar
    }

    @Composable
    fun InnerContent() {
        Scaffold(
            topBar = {
                AdaptiveTopAppBar(
                    themeMode = themeMode,
                    onThemeModeChange = onThemeModeChange,
                    onToggleDrawer = onToggleDrawer,
                    onProfileClick = { navigator.navigate(NavKey.ProfileKey) }
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
                androidx.navigation3.ui.NavDisplay(
                    entries = navigationState.toDecoratedEntries(entryProvider),
                    onBack = { navigator.goBack() }
                )
            }
        }
    }

    if (isNavBarVisible) {
        NavigationSuiteScaffold(
            navigationSuiteItems = {
                defaultNavDestinations.forEach { item ->
                    item(
                        selected = isSameDestinationGroup(navigationState.topLevelRoute, item.key),
                        onClick = { navigator.navigate(item.key) },
                        icon = {
                            if (item.icon != null) {
                                Icon(imageVector = item.icon, contentDescription = item.label)
                            } else if (item.iconResource != null) {
                                Icon(imageVector = vectorResource(item.iconResource), contentDescription = item.label)
                            }
                        },
                        label = { Text(item.label) }
                    )
                }
            },
            modifier = modifier
        ) {
            InnerContent()
        }
    } else {
        Box(modifier = modifier) {
            InnerContent()
        }
    }
}
