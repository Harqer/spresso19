package network

/** Returns the currently authenticated Firebase user's UID, or null if not signed in. */
expect fun getCurrentUserUid(): String?

/** Returns a short-lived Firebase ID token for authenticated server requests. */
expect suspend fun getCurrentUserIdToken(): String?

/** Signs out the current user. */
expect fun signOut()
