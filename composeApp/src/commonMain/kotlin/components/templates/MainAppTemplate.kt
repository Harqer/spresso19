package components.templates

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import components.organisms.AdaptiveNavigationScaffold
import navigation.NavKey
import theme.AppTheme

@Composable
fun MainAppTemplate(
    currentKey: NavKey,
    onNavigate: (NavKey) -> Unit,
    isVoiceRecording: Boolean,
    onToggleVoiceRecording: () -> Unit,
    isDarkTheme: Boolean = false,
    onToggleTheme: () -> Unit = {},
    modifier: Modifier = Modifier,
    content: @Composable (NavKey) -> Unit
) {
    AdaptiveNavigationScaffold(
        currentKey = currentKey,
        onNavigate = onNavigate,
        isVoiceRecording = isVoiceRecording,
        onToggleVoiceRecording = onToggleVoiceRecording,
        isDarkTheme = isDarkTheme,
        onToggleTheme = onToggleTheme,
        modifier = modifier,
        content = content
    )
}
