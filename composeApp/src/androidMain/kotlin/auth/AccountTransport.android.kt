package auth

import com.spresso.SpressoApp

/**
 * Android actual: canonical bootstrap through the process-lifetime
 * ConvexClientWithAuth (official dev.convex Android client). The call goes
 * directly to the `users.bootstrap` Convex mutation — the server derives the
 * caller from ctx.auth.getUserIdentity() (Convex-verified Firebase JWT), so
 * the client sends no identity fields whatsoever.
 */
actual suspend fun bootstrapAccount(displayName: String?, email: String?, photoUrl: String?): AccountLaunchState {
    val app = SpressoApp.instance
        ?: error("Application is not initialized.")
    val result = app.convex.mutation<Map<String, Any?>>(
        "users:bootstrap",
        args = buildMap {
            displayName?.let { put("displayName", it) }
            email?.let { put("email", it) }
            photoUrl?.let { put("photoUrl", it) }
        },
    )
    @Suppress("UNCHECKED_CAST")
    return AccountLaunchState(
        userId = result["userId"] as String,
        firebaseUid = result["firebaseUid"] as String,
        displayName = result["displayName"] as String?,
        email = result["email"] as String?,
        photoUrl = result["photoUrl"] as String?,
        onboardingCompleted = (result["onboardingCompleted"] as? Boolean) == true,
    )
}
