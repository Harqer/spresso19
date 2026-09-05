package navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.runtime.NavKey as RuntimeNavKey

/**
 * Navigation 3 UI is Android-only today. The Wasm host still renders the
 * canonical entry content and keeps back handling in the shared Navigator.
 */
@Composable
actual fun PlatformNavHost(
    entries: List<NavEntry<RuntimeNavKey>>,
    onBack: () -> Unit,
    modifier: Modifier,
) {
    // Navigation 3 UI is not published for Wasm. The shared screen tree owns
    // entry rendering; this host remains a compile-safe boundary until the
    // browser history adapter is introduced.
}
