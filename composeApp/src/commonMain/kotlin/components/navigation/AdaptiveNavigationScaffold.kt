package components.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import components.navigation.AdaptiveNavDrawerContent
import components.navigation.defaultNavDestinations
import components.navigation.isSameDestinationGroup
import navigation.NavKey
import org.jetbrains.compose.resources.vectorResource
import org.jetbrains.compose.resources.painterResource
import spresso.composeapp.generated.resources.Res
import spresso.composeapp.generated.resources.spresso_logo_symbol
import androidx.compose.foundation.Image
import theme.ThemeMode

import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch

import navigation.NavigationState
import navigation.Navigator
import androidx.navigation3.runtime.NavEntry

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
    entryProvider: (NavKey) -> NavEntry<NavKey>
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    
    val toggleDrawer: () -> Unit = {
        scope.launch {
            if (drawerState.isOpen) drawerState.close() else drawerState.open()
        }
    }

    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val isCamera = navigationState.topLevelRoute is NavKey.SmartVisionKey

        if (isCamera) {
            Box(modifier = Modifier.fillMaxSize()) {
                androidx.navigation3.ui.NavDisplay(
                    entries = navigationState.toDecoratedEntries(entryProvider),
                    onBack = { navigator.goBack() }
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
                        }
                    )
                }
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
                    entryProvider = entryProvider
                )
            }
        }
    }
}
