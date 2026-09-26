package auth

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Root auth state machine tests (auth correction scope): a Firebase session
 * alone must never yield Ready; every gate transitions in the required order.
 */
class RootAuthStateTest {
    private val firebaseIn = FirebaseSnapshot(
        uid = "uid-1",
        isEmailPasswordProvider = true,
        isEmailVerified = true,
        displayName = "Owner",
        email = "owner@example.com",
    )
    private val launch = AccountLaunchState(
        userId = "users:1",
        firebaseUid = "uid-1",
        displayName = "Owner",
        email = "owner@example.com",
        photoUrl = null,
        onboardingCompleted = true,
    )

    @Test
    fun `no firebase session is SignedOut regardless of convex state`() {
        val signedOutFirebase = firebaseIn.copy(uid = null)
        assertEquals(
            RootAuthState.SignedOut,
            reduceRootAuthState(RootAuthState.ResolvingFirebase, signedOutFirebase, ConvexSessionSnapshot.Authenticated, launch, null),
        )
        assertEquals(
            RootAuthState.SignedOut,
            reduceRootAuthState(RootAuthState.Ready(launch), signedOutFirebase, ConvexSessionSnapshot.Authenticated, launch, null),
        )
    }

    @Test
    fun `unverified email account is gated before any Convex or bootstrap state`() {
        val unverified = firebaseIn.copy(isEmailVerified = false)
        assertEquals(
            RootAuthState.EmailVerificationRequired("owner@example.com"),
            reduceRootAuthState(RootAuthState.ResolvingFirebase, unverified, ConvexSessionSnapshot.Authenticated, launch, null),
        )
        // The gate also cuts off an in-flight authenticated UI.
        assertEquals(
            RootAuthState.EmailVerificationRequired("owner@example.com"),
            reduceRootAuthState(RootAuthState.Ready(launch), unverified, ConvexSessionSnapshot.Authenticated, launch, null),
        )
    }

    @Test
    fun `convex unauthenticated never renders authenticated product UI`() {
        val state = reduceRootAuthState(RootAuthState.ResolvingFirebase, firebaseIn, ConvexSessionSnapshot.Unauthenticated, null, null)
        assertEquals(RootAuthState.AuthenticatingConvex, state)
    }

    @Test
    fun `convex session loss after authentication is a hard error, not silent readiness`() {
        val state = reduceRootAuthState(RootAuthState.Ready(launch), firebaseIn, ConvexSessionSnapshot.Unauthenticated, launch, null)
        assertTrue(state is RootAuthState.AuthError)
        assertEquals(false, (state as RootAuthState.AuthError).canRetry)
    }

    @Test
    fun `authenticated convex without bootstrap result is BootstrappingUser`() {
        assertEquals(
            RootAuthState.BootstrappingUser,
            reduceRootAuthState(RootAuthState.AuthenticatingConvex, firebaseIn, ConvexSessionSnapshot.Authenticated, null, null),
        )
    }

    @Test
    fun `bootstrap failure surfaces a retryable AuthError`() {
        val state = reduceRootAuthState(RootAuthState.BootstrappingUser, firebaseIn, ConvexSessionSnapshot.Authenticated, null, "network unavailable")
        assertTrue(state is RootAuthState.AuthError)
        assertEquals(true, (state as RootAuthState.AuthError).canRetry)
    }

    @Test
    fun `bootstrap result decides onboarding versus ready`() {
        assertEquals(
            RootAuthState.NeedsOnboarding(launch.copy(onboardingCompleted = false)),
            reduceRootAuthState(RootAuthState.BootstrappingUser, firebaseIn, ConvexSessionSnapshot.Authenticated, launch.copy(onboardingCompleted = false), null),
        )
        assertEquals(
            RootAuthState.Ready(launch),
            reduceRootAuthState(RootAuthState.BootstrappingUser, firebaseIn, ConvexSessionSnapshot.Authenticated, launch, null),
        )
    }

    @Test
    fun `non-email providers skip the verification gate`() {
        val googleUser = firebaseIn.copy(isEmailPasswordProvider = false, isEmailVerified = false)
        assertEquals(
            RootAuthState.BootstrappingUser,
            reduceRootAuthState(RootAuthState.AuthenticatingConvex, googleUser, ConvexSessionSnapshot.Authenticated, null, null),
        )
    }
}
