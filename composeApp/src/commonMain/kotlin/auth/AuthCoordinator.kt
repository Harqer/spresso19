package auth

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.runningFold
import kotlinx.coroutines.flow.stateIn

/**
 * Common auth coordinator: unifies the platform identity session (Firebase),
 * the platform backend session (Convex client adapter), and the canonical
 * bootstrap result into the shared [RootAuthState] state machine.
 *
 * Every platform consumes THIS coordinator from shared UI/domain code — the
 * platform differences live entirely inside the [SpressoBackend] adapter and
 * the platform identity flow. Invariants (enforced by [reduceRootAuthState]):
 * a Firebase session alone never produces [RootAuthState.Ready]; temporary
 * Convex transport recovery never destroys an authenticated position; distinct
 * failure modes surface as distinct [RootAuthState.AuthError] recoveries.
 *
 * The canonical `users.bootstrap` runs exactly once per authenticated cycle,
 * triggered when BOTH the Firebase identity is live AND the Convex backend
 * reports Authenticated.
 */
class AuthCoordinator(
    identity: Flow<IdentitySession>,
    private val backend: SpressoBackend,
    scope: CoroutineScope,
) {
    private val launchStateFlow = MutableStateFlow<LaunchState?>(null)
    private val bootstrapErrorFlow = MutableStateFlow<String?>(null)

    /** Reconcile launch-state inputs with the canonical bootstrap trigger. */
    private data class Inputs(
        val session: IdentitySession,
        val backendSession: BackendSessionSnapshot,
        val launch: LaunchState?,
        val bootstrapError: String?,
    )

    init {
        // Bootstrap trigger: Firebase signed in + Convex Authenticated +
        // no launch result yet and no in-flight failure. Idempotent by the
        // server-side mutation contract; client-side guarded by launchState.
        combine(identity, backend.sessionState) { session, snapshot ->
            session to snapshot
        }.onEach { (session, snapshot) ->
            if (
                session.isSignedIn &&
                snapshot == BackendSessionSnapshot.Authenticated &&
                launchStateFlow.value == null &&
                bootstrapErrorFlow.value == null
            ) {
                try {
                    launchStateFlow.value = backend.bootstrap(
                        displayName = session.displayName,
                        email = session.email,
                        photoUrl = session.photoUrl,
                    )
                } catch (cause: Exception) {
                    bootstrapErrorFlow.value = cause.message ?: "Account bootstrap failed."
                }
            }
            if (!session.isSignedIn) {
                // Signed-out cycle: clear so the next sign-in re-bootstraps.
                launchStateFlow.value = null
                bootstrapErrorFlow.value = null
            }
        }.launchIn(scope)
    }

    val state: StateFlow<RootAuthState> =
        combine(
            identity,
            backend.sessionState,
            launchStateFlow,
            bootstrapErrorFlow,
        ) { session, snapshot, launch, bootstrapError ->
            Inputs(session, snapshot, launch, bootstrapError)
        }.runningFold(RootAuthState.ResolvingFirebase as RootAuthState) { current, inputs ->
            reduceRootAuthState(
                current = current,
                firebase = FirebaseSnapshot(
                    uid = inputs.session.firebaseUid,
                    isEmailPasswordProvider = inputs.session.isEmailPasswordProvider,
                    isEmailVerified = inputs.session.isEmailVerified,
                    displayName = inputs.session.displayName,
                    email = inputs.session.email,
                ),
                convex = when (inputs.backendSession) {
                    BackendSessionSnapshot.Authenticated -> ConvexSessionSnapshot.Authenticated
                    BackendSessionSnapshot.Authenticating -> ConvexSessionSnapshot.Authenticating
                    BackendSessionSnapshot.Refreshing -> ConvexSessionSnapshot.Refreshing
                    BackendSessionSnapshot.Unauthenticated -> ConvexSessionSnapshot.Unauthenticated
                },
                launch = inputs.launch,
                bootstrapError = inputs.bootstrapError,
            )
        }.stateIn(scope, SharingStarted.Eagerly, RootAuthState.ResolvingFirebase)

    /** The last successful launch state (null until bootstrap succeeds). */
    val launch: StateFlow<LaunchState?> = launchStateFlow
}
