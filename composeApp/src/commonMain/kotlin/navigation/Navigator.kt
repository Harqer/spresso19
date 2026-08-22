package navigation

import components.navigation.isSameDestinationGroup

/**
 * Handles navigation events (forward and back) by updating the navigation state.
 */
class Navigator(
    val state: NavigationState,
) {
    fun navigate(route: NavKey) {
        val topLevelMatch = state.topLevelRoutes.firstOrNull { isSameDestinationGroup(it, route) }

        if (topLevelMatch != null) {
            // This is a top level route or belongs to one, just switch to it.
            // (Wait, if it's the exact top level route, we switch. If it's a sub-route
            // we switch to the tab and push it.)
            if (state.topLevelRoute != topLevelMatch) {
                state.topLevelRoute = topLevelMatch
            }

            // If they clicked the bottom tab again (which passes the exact topLevelMatch key),
            // we could pop back to root. For now, we push or reset if needed.
            // Navigation3 multiple backstacks recipe normally adds sub-routes to the active stack.
            if (route != topLevelMatch) {
                state.backStacks[state.topLevelRoute]?.add(route)
            } else if (state.backStacks[state.topLevelRoute]?.lastOrNull() != route) {
                state.backStacks[state.topLevelRoute]?.add(route)
            }
        } else {
            // It's a deep route, add it to the active stack.
            state.backStacks[state.topLevelRoute]?.add(route)
        }
    }

    fun replace(route: NavKey) {
        val currentStack = state.backStacks[state.topLevelRoute] ?: return
        if (currentStack.size > 0) {
            currentStack.removeLastOrNull()
        }
        currentStack.add(route)
    }

    fun goBack() {
        val currentStack = state.backStacks[state.topLevelRoute] ?: error("Stack for ${state.topLevelRoute} not found")
        val currentRoute = currentStack.lastOrNull()

        // If we're at the base of the current route, go back to the start route stack.
        if (currentRoute == state.topLevelRoute && state.topLevelRoute != state.startRoute) {
            state.topLevelRoute = state.startRoute
        } else {
            currentStack.removeLastOrNull()
        }
    }
}
