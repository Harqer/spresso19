package auth

import com.google.firebase.auth.FirebaseUser
import com.spresso.SpressoApp
import dev.convex.android.AuthState
import kotlinx.coroutines.flow.StateFlow

/**
 * Android actual: the official Convex Android client (process-lifetime
 * ConvexClientWithAuth in SpressoApp) behind the common [SpressoBackend]
 * contract. The canonical `users.bootstrap` mutation is called directly —
 * no HTTP involved; the Convex-verified Firebase identity is authoritative
 * server-side (the client sends only optional profile hints).
 */
private class AndroidSpressoBackend(
    private val authState: StateFlow<AuthState<FirebaseUser>>,
    private val client: dev.convex.android.ConvexClientWithAuth<FirebaseUser>,
) : SpressoBackend {
    override val sessionState: StateFlow<BackendSessionSnapshot> =
        SessionStateFlow(authState)

    override suspend fun bootstrap(displayName: String?, email: String?, photoUrl: String?): LaunchState {
        val result = client.mutation<Map<String, Any?>>(
            "users:bootstrap",
            args = buildMap {
                displayName?.let { put("displayName", it) }
                email?.let { put("email", it) }
                photoUrl?.let { put("photoUrl", it) }
            },
        )
        return LaunchState(
            userId = result["userId"] as String,
            firebaseUid = result["firebaseUid"] as String,
            displayName = result["displayName"] as String?,
            email = result["email"] as String?,
            photoUrl = result["photoUrl"] as String?,
            onboardingCompleted = (result["onboardingCompleted"] as? Boolean) == true,
        )
    }
}

/** Maps the 0.8.0 AuthState flow onto the common snapshot flow. */
private class SessionStateFlow(
    private val source: StateFlow<AuthState<FirebaseUser>>,
) : StateFlow<BackendSessionSnapshot> {
    override val value: BackendSessionSnapshot
        get() = source.value.toSnapshot()

    override val replayCache: List<BackendSessionSnapshot>
        get() = source.replayCache.map { it.toSnapshot() }

    override suspend fun collect(collector: kotlinx.coroutines.flow.FlowCollector<BackendSessionSnapshot>): Nothing {
        source.collect { collector.emit(it.toSnapshot()) }
        throw IllegalStateException("Unreachable: StateFlow collection never completes normally.")
    }
}

private fun AuthState<FirebaseUser>.toSnapshot(): BackendSessionSnapshot = when (this) {
    is AuthState.Authenticated -> BackendSessionSnapshot.Authenticated
    is AuthState.AuthLoading -> BackendSessionSnapshot.Authenticating
    else -> BackendSessionSnapshot.Unauthenticated
}

actual fun provideSpressoBackend(): SpressoBackend {
    val app = SpressoApp.instance ?: error("Application is not initialized.")
    return AndroidSpressoBackend(app.authState, app.convex)
}
