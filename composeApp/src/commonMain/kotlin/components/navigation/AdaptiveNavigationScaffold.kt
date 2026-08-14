package components.navigation

import components.models.*

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
import spresso19.composeapp.generated.resources.Res
import spresso19.composeapp.generated.resources.spresso_logo_symbol
import androidx.compose.foundation.Image
import theme.ThemeMode

import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch

@Composable
fun AdaptiveNavigationScaffold(
    currentKey: NavKey,
    onNavigate: (NavKey) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    content: @Composable (NavKey) -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    
    val toggleDrawer: () -> Unit = {
        scope.launch {
            if (drawerState.isOpen) drawerState.close() else drawerState.open()
        }
    }

    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val isCamera = currentKey is NavKey.SmartVisionKey

        if (isCamera) {
            Box(modifier = Modifier.fillMaxSize()) {
                content(currentKey)
            }
        } else {
            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    AdaptiveNavDrawerContent(
                        currentKey = currentKey,
                        onNavigate = { key ->
                            onNavigate(key)
                            scope.launch { drawerState.close() }
                        }
                    )
                }
            ) {
                AdaptiveScaffoldBody(
                    currentKey = currentKey,
                    showBottomBar = true,
                    onNavigate = onNavigate,
                    isVoiceRecording = isVoiceRecording,
                    onToggleVoiceRecording = onToggleVoiceRecording,
                    themeMode = themeMode,
                    onThemeModeChange = onThemeModeChange,
                    onToggleDrawer = toggleDrawer,
                    onAskAI = onAskAI,
                    content = content
                )
            }
        }
    }
}
