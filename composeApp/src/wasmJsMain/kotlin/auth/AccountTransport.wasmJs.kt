package auth

import kotlinx.coroutines.await
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import network.ConvexApi

/**
 * Web (wasmJs) actual: canonical bootstrap over the authenticated HTTP bridge
 * — the one platform where HTTP ingress is genuinely required today. The
 * bridge verifies the Firebase bearer token and runs the SAME
 * `users.bootstrap` mutation server-side; no client identity fields are sent
 * or trusted.
 */
actual suspend fun bootstrapAccount(
    displayName: String?,
    email: String?,
    photoUrl: String?,
): AccountLaunchState {
    val payload = ConvexApi().bootstrapUser(displayName, email, photoUrl)
    return AccountLaunchState(
        userId = payload.getValue("userId").jsonPrimitive.content,
        firebaseUid = payload.getValue("firebaseUid").jsonPrimitive.content,
        displayName = payload["displayName"]?.jsonPrimitive?.content,
        email = payload["email"]?.jsonPrimitive?.content,
        photoUrl = payload["photoUrl"]?.jsonPrimitive?.content,
        onboardingCompleted = payload.getValue("onboardingCompleted").jsonPrimitive.content == "true",
    )
}
