package com.spresso

import android.app.Application
import android.util.Log
import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.meta.wearable.dat.core.Wearables
import dev.convex.android.ConvexClientWithAuth
import dev.convex.android.AuthState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import network.SpressoConfig

/**
 * Application class owning process-lifetime singletons.
 *
 * Convex session (auth correction scope): ONE ConvexClientWithAuth for the
 * whole process, backed by FirebaseConvexAuthProvider. The client's authState
 * (Unauthenticated → AuthLoading → Authenticated) is the source the app root
 * composes with Firebase's own state: a Firebase session alone never renders
 * authenticated Spresso — the Convex session must reach Authenticated first.
 *
 * The Firebase ID token exists only inside the SDK-managed session (pushed
 * through the provider's onIdToken callback, pulled by the Convex bridge on
 * reconnect). It is never stored in app state, never persisted, never logged.
 */
class SpressoApp : Application() {
    lateinit var convex: ConvexClientWithAuth<FirebaseUser>
        private set

    /** Exposed for the host's root state machine (auth correction §19). */
    val authState: StateFlow<AuthState<FirebaseUser>>
        get() = convex.authState

    override fun onCreate() {
        super.onCreate()
        instance = this
        Firebase.appCheck.installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance(),
        )
        Wearables.initialize(this).onFailure { error, _ ->
            // DAT may be unavailable on devices without the Meta Wearables service.
            // Keep the app usable and let the wearable onboarding surface the error.
            Log.e(TAG, "Meta Wearables DAT initialization failed: ${error.description}")
        }

        val provider = FirebaseConvexAuthProvider(FirebaseAuth.getInstance())
        convex = ConvexClientWithAuth(
            deploymentUrl = SpressoConfig.convexDeploymentUrl,
            authProvider = provider,
        )
        // If Firebase already holds a session (app restart), bring the Convex
        // client up from that cached session without any UI. Failure lands the
        // client in Unauthenticated; the root state machine then shows AuthPage.
        CoroutineScope(Dispatchers.Main + SupervisorJob()).launch {
            runCatching { convex.loginFromCache() }
        }
    }

    companion object {
        /** Process-wide accessor for the Convex session holder. */
        @Volatile
        var instance: SpressoApp? = null
            private set

        private const val TAG = "SpressoApp"
    }
}
