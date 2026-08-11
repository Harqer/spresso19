package network

/** Returns the currently authenticated Firebase user's UID, or null if not signed in. */
expect fun getCurrentUserUid(): String?
