package navigation

import androidx.compose.runtime.AbstractApplier
import androidx.compose.runtime.Composition
import androidx.compose.runtime.Recomposer
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

class NavigationStateTest {
    @Test
    fun signInRemainsVisibleWhenStartRouteIsNotATab() =
        runTest {
            val recomposer = Recomposer(coroutineContext)
            val composition = Composition(NoOpApplier(), recomposer)
            try {
                lateinit var state: NavigationState
                composition.setContent {
                    state =
                        rememberNavigationState(
                            startRoute = NavKey.SplashScreenKey,
                            topLevelRoutes = setOf(NavKey.ChatKey(), NavKey.ProfileKey),
                        )
                }
                val navigator = Navigator(state)
                navigator.resetTo(NavKey.AuthKey)

                assertEquals(NavKey.AuthKey, state.backStacks[state.topLevelRoute]?.lastOrNull())
                navigator.goBack()
                assertEquals(NavKey.AuthKey, state.backStacks[state.topLevelRoute]?.lastOrNull())
            } finally {
                composition.dispose()
                recomposer.cancel()
            }
        }

    private class NoOpApplier : AbstractApplier<Unit>(Unit) {
        override fun insertTopDown(index: Int, instance: Unit) = Unit
        override fun insertBottomUp(index: Int, instance: Unit) = Unit
        override fun remove(index: Int, count: Int) = Unit
        override fun move(from: Int, to: Int, count: Int) = Unit
        override fun onClear() = Unit
    }
}
