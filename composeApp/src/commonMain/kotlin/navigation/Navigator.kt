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
        val currentStack = state.backStacks[state.topLevelRoute] ?: return
        if (currentStack.size > 0) {
            currentStack.removeLastOrNull()
        }
        currentStack.add(route)
    }

    fun resetTo(key: NavKey) {
        state.backStacks.values.forEach { it.clear() }
        state.backStacks[state.startRoute]?.add(key)
        state.topLevelRoute = state.startRoute
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
