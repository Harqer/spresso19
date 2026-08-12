package network

/**
 * Reads the current Firebase Auth UID from the JS Firebase SDK.
 * The web app initialises Firebase Auth in firebase.ts and the current user
 * is accessible via `firebase.auth().currentUser.uid`.
 */
@JsFun("() => { try { return window.__firebase_auth_uid__ || null; } catch(e) { return null; } }")
private external fun readFirebaseUidFromJs(): String?

actual fun getCurrentUserUid(): String? = readFirebaseUidFromJs()

actual suspend fun getCurrentUserIdToken(): String? = null
