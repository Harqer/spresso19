package navigation

import components.navigation.isSameDestinationGroup

/**
 * Handles navigation events (forward and back) by updating the navigation state.
 */
class Navigator(
    val state: NavigationState,
) {
    private data class FutureNavigation(
        val topLevelRoute: NavKey,
        val route: NavKey? = null,
    )

    private val futureNavigation = mutableListOf<FutureNavigation>()

    fun navigate(route: NavKey) {
        // A new user action forks history; browser forward entries are no longer
        // valid after that fork.
        futureNavigation.clear()
        val topLevelMatch = state.topLevelRoutes.firstOrNull { isSameDestinationGroup(it, route) }

        if (topLevelMatch != null) {
            // A tab destination: switch to its tab, matching the multiple-back-stacks
            // recipe. A top-level key carrying extra data (e.g. ChatKey with an initial
            // prompt) is pushed on the tab's stack so the data reaches its screen;
            // tapping the tab bar itself (the canonical key) only switches.
            state.topLevelRoute = topLevelMatch
            if (route != topLevelMatch) {
                state.backStacks[topLevelMatch]?.add(route)
            }
        } else {
            // It's a deep route, add it to the active stack.
            state.backStacks[state.topLevelRoute]?.add(route)
        }
    }

    fun replace(route: NavKey) {
        futureNavigation.clear()
        val currentStack = state.backStacks[state.topLevelRoute] ?: return
        if (currentStack.size > 0) {
            currentStack.removeLastOrNull()
        }
        currentStack.add(route)
    }

    fun resetTo(key: NavKey) {
        futureNavigation.clear()
        state.backStacks.values.forEach { it.clear() }
        state.backStacks[state.startRoute]?.add(key)
        state.topLevelRoute = state.startRoute
    }

    fun goForward() {
        val future = futureNavigation.removeLastOrNull() ?: return
        state.topLevelRoute = future.topLevelRoute
        future.route?.let { route ->
            state.backStacks[future.topLevelRoute]?.add(route)
        }
    }

    fun goBack() {
        val currentStack = state.backStacks[state.topLevelRoute] ?: error("Stack for ${state.topLevelRoute} not found")
        val currentRoute = currentStack.lastOrNull()

        // Browser history can send a back event even when the current stack is
        // already at its root. Preserve the root entry instead of rendering an
        // empty host (Android's NavDisplay normally guards this for us).
        if (currentStack.size <= 1 && state.topLevelRoute == state.startRoute) return

        // If we're at the base of a non-start tab, remember the tab selection
        // so browser Forward can restore it without duplicating its root entry.
        if (currentRoute == state.topLevelRoute && state.topLevelRoute != state.startRoute) {
            futureNavigation += FutureNavigation(topLevelRoute = state.topLevelRoute)
            state.topLevelRoute = state.startRoute
        } else {
            val removedRoute = currentStack.removeLastOrNull() ?: return
            futureNavigation +=
                FutureNavigation(
                    topLevelRoute = state.topLevelRoute,
                    route = removedRoute as? NavKey,
                )
        }
    }
}
