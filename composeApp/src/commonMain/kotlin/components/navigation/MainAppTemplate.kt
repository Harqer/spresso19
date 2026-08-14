package components.navigation

import components.models.*

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import components.navigation.AdaptiveNavigationScaffold
import navigation.NavKey
import theme.AppTheme
import theme.ThemeMode

@Composable
fun MainAppTemplate(
    currentKey: NavKey,
    onNavigate: (NavKey) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    onThemeModeChange: (ThemeMode) -> Unit = {},
    onAskAI: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    content: @Composable (NavKey) -> Unit
) {
    AdaptiveNavigationScaffold(
        currentKey = currentKey,
        onNavigate = onNavigate,
        isVoiceRecording = isVoiceRecording,
        onToggleVoiceRecording = onToggleVoiceRecording,
        themeMode = themeMode,
        onThemeModeChange = onThemeModeChange,
        onAskAI = onAskAI,
        modifier = modifier,
        content = content
    )
}
