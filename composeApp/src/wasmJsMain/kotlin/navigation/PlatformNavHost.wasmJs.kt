@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.NavEntry
import kotlinx.browser.window
import androidx.navigation3.runtime.NavKey as RuntimeNavKey

@JsFun("() => { const value = window.history.state?.spressoIndex; return Number.isInteger(value) ? value : null; }")
private external fun browserHistoryIndex(): Int?

@JsFun(
    """
(index, hash, replace) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    const state = { spressoIndex: index };
    if (replace) window.history.replaceState(state, "", url.href);
    else window.history.pushState(state, "", url.href);
}
""",
)
private external fun writeBrowserHistory(
    index: Int,
    hash: String,
    replace: Boolean,
)

/**
 * Browser host for the shared Navigation 3 entries.
 *
 * Navigation 3's Android UI host is not available on Wasm, but its runtime
 * entries are common. The browser renders the active entry directly and maps
 * browser back/forward traversal to the shared Navigator. Route tokens are
 * opaque hashes so serialized navigation arguments never enter the URL.
 */
@Composable
actual fun PlatformNavHost(
    entries: List<NavEntry<RuntimeNavKey>>,
    onBack: () -> Unit,
    onForward: () -> Unit,
    modifier: Modifier,
) {
    val activeEntry = entries.lastOrNull()
    val routeToken =
        activeEntry
            ?.contentKey
            ?.toString()
            ?.hashCode()
            ?.toUInt()
            ?.toString(36)
    var hasInitializedHistory by remember { mutableStateOf(false) }
    var historyIndex by remember { mutableStateOf(0) }
    var handlingTraversal by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        val listener: (org.w3c.dom.events.Event) -> Unit = {
            if (!handlingTraversal) {
                val targetIndex = browserHistoryIndex()
                if (targetIndex != null) {
                    val delta = targetIndex - historyIndex
                    historyIndex = targetIndex
                    handlingTraversal = true
                    when {
                        delta < 0 -> repeat(-delta) { onBack() }
                        delta > 0 -> repeat(delta) { onForward() }
                    }
                    window.setTimeout({
                        handlingTraversal = false
                        null
                    }, 0)
                }
            }
        }
        window.addEventListener("popstate", listener)
        window.addEventListener("hashchange", listener)
        onDispose {
            window.removeEventListener("popstate", listener)
            window.removeEventListener("hashchange", listener)
        }
    }

    LaunchedEffect(routeToken) {
        if (routeToken == null || handlingTraversal) return@LaunchedEffect
        val hash = "spresso/$routeToken"
        if (!hasInitializedHistory) {
            historyIndex = 0
            writeBrowserHistory(index = historyIndex, hash = hash, replace = true)
            hasInitializedHistory = true
        } else {
            historyIndex += 1
            writeBrowserHistory(index = historyIndex, hash = hash, replace = false)
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        activeEntry?.Content()
    }
}
