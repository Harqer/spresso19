package components.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import kotlinx.coroutines.launch
import navigation.NavKey
import navigation.NavigationState
import navigation.Navigator
import theme.ThemeMode

@Composable
fun AdaptiveNavigationScaffold(
    navigationState: NavigationState,
    navigator: Navigator,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    modifier: Modifier = Modifier,
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    onThemeModeChange: (ThemeMode) -> Unit = {},
    onAskAI: (String) -> Unit = {},
    entryProvider: (NavKey) -> NavEntry<NavKey>,
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val toggleDrawer: () -> Unit = {
        scope.launch {
            if (drawerState.isOpen) drawerState.close() else drawerState.open()
        }
    }

    val isCamera = navigationState.topLevelRoute is NavKey.SmartVisionKey

    if (isCamera) {
        Box(modifier = modifier.fillMaxSize()) {
            navigation.PlatformNavHost(
                entries = navigationState.toDecoratedEntries(entryProvider),
                onBack = { navigator.goBack() },
            )
        }
    } else {
        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                AdaptiveNavDrawerContent(
                    currentKey = navigationState.topLevelRoute,
                    onNavigate = { key ->
                        navigator.navigate(key)
                        scope.launch { drawerState.close() }
                    },
                )
            },
        ) {
            AdaptiveScaffoldBody(
                navigationState = navigationState,
                navigator = navigator,
                showBottomBar = true,
                isVoiceRecording = isVoiceRecording,
                onToggleVoiceRecording = onToggleVoiceRecording,
                themeMode = themeMode,
                onThemeModeChange = onThemeModeChange,
                onToggleDrawer = toggleDrawer,
                onAskAI = onAskAI,
                entryProvider = entryProvider,
            )
        }
    }
}
