package navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.runtime.NavKey as RuntimeNavKey

/** Platform navigation surface. Android uses Navigation 3 UI; Wasm uses the same
 * typed entries with a browser-native host so common code never depends on an
 * Android-only UI artifact. */
@Composable
expect fun PlatformNavHost(
    entries: List<NavEntry<RuntimeNavKey>>,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
)
