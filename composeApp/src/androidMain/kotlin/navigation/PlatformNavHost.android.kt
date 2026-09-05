package navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.runtime.NavKey as RuntimeNavKey
import androidx.navigation3.ui.NavDisplay

@Composable
actual fun PlatformNavHost(
    entries: List<NavEntry<RuntimeNavKey>>,
    onBack: () -> Unit,
    modifier: Modifier,
) {
    NavDisplay(entries = entries, onBack = onBack, modifier = modifier)
}
