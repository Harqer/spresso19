package components.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import navigation.NavKey
import navigation.NavigationState
import navigation.Navigator
import theme.ThemeMode

@Composable
fun MainAppTemplate(
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
    AdaptiveNavigationScaffold(
        navigationState = navigationState,
        navigator = navigator,
        isVoiceRecording = isVoiceRecording,
        onToggleVoiceRecording = onToggleVoiceRecording,
        themeMode = themeMode,
        onThemeModeChange = onThemeModeChange,
        onAskAI = onAskAI,
        modifier = modifier,
        entryProvider = entryProvider,
    )
}
