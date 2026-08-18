package network

/** Returns the currently authenticated Firebase user's UID, or null if not signed in. */
expect fun getCurrentUserUid(): String?

/** Returns a short-lived Firebase ID token for authenticated server requests. */
expect suspend fun getCurrentUserIdToken(): String?

/** Signs out the current user. */
expect fun signOut()

/** Signs in with email and password */
expect suspend fun signInWithEmailAndPassword(email: String, password: String): Boolean

/** Creates a new user with email and password */
expect suspend fun createUserWithEmailAndPassword(email: String, password: String): Boolean

/** Signs in with Google */
expect suspend fun signInWithGoogle(): Boolean

