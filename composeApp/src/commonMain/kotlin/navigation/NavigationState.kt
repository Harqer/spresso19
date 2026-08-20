package navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.runtime.rememberDecoratedNavEntries
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.runtime.rememberSaveableStateHolderNavEntryDecorator
import components.navigation.isSameDestinationGroup

/**
 * Creates a navigation state that manages multiple back stacks.
 */
@Composable
fun rememberNavigationState(
    startRoute: NavKey,
    topLevelRoutes: Set<NavKey>
): NavigationState {
    val topLevelRouteState = remember { mutableStateOf(startRoute) }

    // Create a back stack for each top level route.
    val backStacks = buildMap<NavKey, NavBackStack<androidx.navigation3.runtime.NavKey>> {
        topLevelRoutes.forEach { route ->
            put(route, rememberNavBackStack(route))
        }
    }

    return remember(startRoute, topLevelRoutes) {
        NavigationState(
            startRoute = startRoute,
            topLevelRouteState = topLevelRouteState,
            backStacks = backStacks,
            topLevelRoutes = topLevelRoutes
        )
    }
}

/**
 * State holder for navigation state.
 */
class NavigationState(
    val startRoute: NavKey,
    val topLevelRouteState: MutableState<NavKey>,
    val backStacks: Map<NavKey, NavBackStack<androidx.navigation3.runtime.NavKey>>,
    val topLevelRoutes: Set<NavKey>
) {
    var topLevelRoute: NavKey by topLevelRouteState

    @Composable
    fun toDecoratedEntries(
        entryProvider: (NavKey) -> NavEntry<NavKey>
    ): List<NavEntry<androidx.navigation3.runtime.NavKey>> {
        val decoratedEntries = backStacks.mapValues { (_, stack) ->
            val decorators = listOf(
                rememberSaveableStateHolderNavEntryDecorator<androidx.navigation3.runtime.NavKey>(),
            )
            val wrappedProvider: (androidx.navigation3.runtime.NavKey) -> NavEntry<androidx.navigation3.runtime.NavKey> = {
                // We know our keys are navigation.NavKey
                val result = entryProvider(it as NavKey)
                // NavEntry is generic, we must cast it
                @Suppress("UNCHECKED_CAST")
                result as NavEntry<androidx.navigation3.runtime.NavKey>
            }
            rememberDecoratedNavEntries(
                backStack = stack,
                entryDecorators = decorators,
                entryProvider = wrappedProvider
            )
        }

        return getTopLevelRoutesInUse()
            .flatMap { decoratedEntries[it] ?: emptyList() }
    }

    private fun getTopLevelRoutesInUse(): List<NavKey> =
        if (isSameDestinationGroup(topLevelRoute, startRoute)) {
            listOf(startRoute)
        } else {
            listOf(startRoute, topLevelRoute)
        }
}
