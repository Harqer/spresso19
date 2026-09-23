package components.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import components.features.chat.AIShopperInputBar
import navigation.NavKey
import navigation.NavigationState
import navigation.Navigator
import theme.ThemeMode

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
    entryProvider: (NavKey) -> NavEntry<NavKey>,
) {
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
                    onProfileClick = { navigator.navigate(NavKey.ProfileKey) },
                )
            },
            bottomBar = {
                if (showBottomBar) {
                    AIShopperInputBar(
                        onSend = onAskAI,
                        isVoiceActive = isVoiceRecording,
                        onToggleVoice = onToggleVoiceRecording,
                        placeholder = "Ask Spresso...",
                        modifier =
                            Modifier
                                .navigationBarsPadding()
                                .imePadding(),
                    )
                }
            },
        ) { innerPadding ->
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                navigation.PlatformNavHost(
                    entries = navigationState.toDecoratedEntries(entryProvider),
                    onBack = { navigator.goBack() },
                    onForward = { navigator.goForward() },
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
                            val isSelected = isSameDestinationGroup(navigationState.topLevelRoute, item.key)
                            Icon(
                                imageVector = if (isSelected) item.selectedIcon else item.icon,
                                contentDescription = item.label,
                            )
                        },
                        label = { Text(item.label) },
                    )
                }
            },
            modifier = modifier,
        ) {
            InnerContent()
        }
    } else {
        Box(modifier = modifier) {
            InnerContent()
        }
    }
}
