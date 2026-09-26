package auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Web (wasmJs) actual: COMPATIBILITY TRANSPORT over the authenticated HTTP
 * bridge, which executes the SAME canonical `users.bootstrap` Convex mutation
 * server-side (auth remediation §28). The native Convex JS client with
 * setAuth(Firebase ID token) is the end state; this adapter keeps web on the
 * identical identity semantics until that adapter lands — no separate web
 * business logic, no alternate ownership scheme.
 */
private class WebSpressoBackend : SpressoBackend {
    // No long-lived Convex socket session exists on web yet; the bridge
    // authenticates per request with the Firebase bearer token. The session
    // snapshot mirrors that reality (Authenticating until a bootstrap proves
    // an authenticated round-trip) — never a fabricated Authenticated state.
    override val sessionState: StateFlow<BackendSessionSnapshot> =
        MutableStateFlow(BackendSessionSnapshot.Authenticating)

    override suspend fun bootstrap(displayName: String?, email: String?, photoUrl: String?): LaunchState {
        val payload = network.ConvexApi().bootstrapUser(displayName, email, photoUrl).jsonObject
        return LaunchState(
            userId = payload.getValue("userId").jsonPrimitive.content,
            firebaseUid = payload.getValue("firebaseUid").jsonPrimitive.content,
            displayName = payload["displayName"]?.jsonPrimitive?.content,
            email = payload["email"]?.jsonPrimitive?.content,
            photoUrl = payload["photoUrl"]?.jsonPrimitive?.content,
            onboardingCompleted = payload.getValue("onboardingCompleted").jsonPrimitive.content == "true",
        )
    }
}

actual fun provideSpressoBackend(): SpressoBackend = WebSpressoBackend()
