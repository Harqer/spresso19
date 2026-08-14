# Firebase Authentication & User Profile Master Guide

This guide consolidates Firebase Authentication patterns, real-time auth state observers, live user profile reading, dynamic profile updates, Firestore document snapshot synchronization, and re-authentication security standards across Web (JS/TS) and Android (Kotlin/Compose).

---

## 1. Real-Time Auth State Listening

Auth state listening allows applications to react dynamically to sign-in, sign-out, token refresh, and initial session loading without manual state polling.

### JavaScript / TypeScript (Modular SDK v9+)

In Web/React applications, use `onAuthStateChanged` or `onIdTokenChanged` paired with custom hooks or state containers. Always unsubscribe on component unmount or cleanup.

```typescript
import { getAuth, onAuthStateChanged, onIdTokenChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

/**
 * Custom React hook for observing real-time auth state changes.
 */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = getAuth();

    // Subscribe to auth state changes (sign-in, sign-out)
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.error("Auth state observer error:", error);
        setLoading(false);
      }
    );

    // Unsubscribe listener when component unmounts
    return () => unsubscribe();
  }, []);

  return { user, loading };
}
```

### Kotlin (Android / Jetpack Compose / Coroutines Flow)

In Android applications, leverage Kotlin `callbackFlow` to convert `FirebaseAuth.AuthStateListener` into an asynchronous cold `Flow` for clean Architecture / ViewModel integration.

#### Coroutine Flow Wrapper (Repository Layer)

```kotlin
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth
) {
    /**
     * Cold Flow emitting real-time updates when current user changes.
     */
    val authStateFlow: Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser)
        }
        
        auth.addAuthStateListener(listener)

        // Automatically unregister listener when Flow collection stops
        awaitClose {
            auth.removeAuthStateListener(listener)
        }
    }
}
```

#### Jetpack Compose Lifecycle Observer

```kotlin
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser

@Composable
fun AuthStateObserver(
    auth: FirebaseAuth = FirebaseAuth.getInstance(),
    onAuthStateChanged: (FirebaseUser?) -> Unit
) {
    DisposableEffect(auth) {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            onAuthStateChanged(firebaseAuth.currentUser)
        }
        
        auth.addAuthStateListener(listener)

        onDispose {
            auth.removeAuthStateListener(listener)
        }
    }
}
```

---

## 2. Live Profile Property Reading

Firebase Auth maintains core identity attributes on the `User` (JS) / `FirebaseUser` (Kotlin) object.

### Standard User Profile Properties

| Property Name | JS Type | Kotlin Type | Description |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | `String` | Permanent, globally unique user ID across all identity providers |
| `displayName` | `string \| null` | `String?` | Display name attached to the user profile |
| `email` | `string \| null` | `String?` | Primary email address |
| `photoURL` / `photoUrl` | `string \| null` | `Uri?` | Avatar photo URL |
| `emailVerified` | `boolean` | `Boolean` | Flag confirming email ownership |
| `isAnonymous` | `boolean` | `Boolean` | True if authenticated via anonymous guest flow |
| `providerData` | `UserInfo[]` | `List<UserInfo>` | List of linked identity providers (Google, Email/Pass, Apple, etc.) |

### Provider Data Inspection & Linked Accounts

`providerData` contains identity records for each identity provider attached to the primary account.

#### Web (JS/TS)

```typescript
import { User } from "firebase/auth";

export interface ProviderDetail {
  providerId: string;
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function extractProviderDetails(user: User): ProviderDetail[] {
  return user.providerData.map((profile) => ({
    providerId: profile.providerId, // e.g., 'google.com', 'password', 'apple.com'
    uid: profile.uid,
    displayName: profile.displayName,
    email: profile.email,
    photoURL: profile.photoURL,
  }));
}
```

#### Android (Kotlin)

```kotlin
import com.google.firebase.auth.FirebaseUser

data class UserProviderInfo(
    val providerId: String,
    val uid: String,
    val displayName: String?,
    val email: String?,
    val photoUrl: String?
)

fun getLinkedProviders(user: FirebaseUser): List<UserProviderInfo> {
    return user.providerData.map { profile ->
        UserProviderInfo(
            providerId = profile.providerId, // e.g., "google.com", "password"
            uid = profile.uid,
            displayName = profile.displayName,
            email = profile.email,
            photoUrl = profile.photoUrl?.toString()
        )
    }
}
```

---

## 3. Dynamic Profile Update Methods

Firebase Auth provides direct APIs to update user attributes (`displayName`, `photoURL`, `email`, `password`). After completing an update, force a local user token reload using `user.reload()` to sync client state.

### Web (JS/TS)

```typescript
import { 
  getAuth, 
  updateProfile, 
  updateEmail, 
  sendEmailVerification,
  User 
} from "firebase/auth";

/**
 * Updates display name and avatar photo URL for the currently signed-in user.
 */
export async function updateUserProfile(
  newDisplayName: string,
  newPhotoURL: string
): Promise<void> {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Cannot update profile: No user is currently signed in.");
  }

  // Perform profile update
  await updateProfile(currentUser, {
    displayName: newDisplayName,
    photoURL: newPhotoURL,
  });

  // Reload user state to ensure token claims and local cached properties sync
  await currentUser.reload();
}

/**
 * Updates primary email address and triggers verification email.
 */
export async function updateUserEmailAddress(newEmail: string): Promise<void> {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error("No user signed in.");

  await updateEmail(currentUser, newEmail);
  await sendEmailVerification(currentUser);
  await currentUser.reload();
}
```

### Android (Kotlin)

```kotlin
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.UserProfileChangeRequest
import kotlinx.coroutines.tasks.await

/**
 * Dynamically updates display name and avatar photo URI for the current FirebaseUser.
 */
suspend fun updateUserProfileDetails(
    newDisplayName: String,
    newPhotoUri: Uri?
) {
    val user = FirebaseAuth.getInstance().currentUser 
        ?: throw IllegalStateException("No authenticated user found.")

    val profileUpdates = UserProfileChangeRequest.Builder()
        .setDisplayName(newDisplayName)
        .apply {
            if (newPhotoUri != null) {
                setPhotoUri(newPhotoUri)
            }
        }
        .build()

    // Apply update asynchronously using Kotlin Coroutines await()
    user.updateProfile(profileUpdates).await()
    
    // Refresh user state locally
    user.reload().await()
}
```

---

## 4. Real-Time Firestore Document Snapshot Sync

While Firebase Auth manages core authentication credentials, extended user data (roles, preferences, addresses, cart history) belongs in Firestore under `users/{uid}`. Combining `onAuthStateChanged` with Firestore `onSnapshot` / `addSnapshotListener` guarantees real-time document synchronization.

### Web (JS/TS)

```typescript
import { getFirestore, doc, onSnapshot, DocumentData } from "firebase/firestore";
import { useEffect, useState } from "react";

/**
 * Real-time listener for user profile document in Firestore (`users/{uid}`).
 */
export function useUserProfileDocument(uid: string | null) {
  const [profileDoc, setProfileDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfileDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirestore();
    const docRef = doc(db, "users", uid);

    // Subscribe to document snapshot changes
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfileDoc(snapshot.data());
        } else {
          setProfileDoc(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firestore snapshot error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Unsubscribe listener when UID changes or unmount occurs
    return () => unsubscribe();
  }, [uid]);

  return { profileDoc, loading, error };
}
```

### Android (Kotlin / Coroutines Flow)

```kotlin
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject

class UserDocumentRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    /**
     * Cold Flow listening to real-time changes on `users/{uid}` Firestore document.
     */
    fun observeUserDocument(uid: String): Flow<DocumentSnapshot?> = callbackFlow {
        val docRef = firestore.collection("users").document(uid)

        val registration = docRef.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            trySend(snapshot)
        }

        awaitClose {
            registration.remove()
        }
    }
}
```

---

## 5. Re-Authentication & Security Standards

Sensitive security actions (such as modifying email/password, linking credentials, or deleting accounts) require recent user authentication. If the session token is old, Firebase Auth throws `auth/requires-recent-login`.

### Re-Authentication Standard Workflow

1. Catch `auth/requires-recent-login` error.
2. Prompt user to re-enter their current password or re-authenticate via OAuth provider popup/credential.
3. Call `reauthenticateWithCredential(...)`.
4. Retry the requested sensitive operation.

#### Web (JS/TS) Re-Authentication Example

```typescript
import { 
  getAuth, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updatePassword 
} from "firebase/auth";

export async function safeUpdatePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user || !user.email) {
    throw new Error("Authenticated user with email is required.");
  }

  // Construct credential from current password
  const credential = EmailAuthProvider.credential(user.email, currentPassword);

  try {
    // Re-authenticate session
    await reauthenticateWithCredential(user, credential);
    
    // Execute security-sensitive action
    await updatePassword(user, newPassword);
  } catch (error: any) {
    if (error.code === "auth/requires-recent-login") {
      throw new Error("Session expired. Re-authentication required before changing password.");
    }
    throw error;
  }
}
```

#### Android (Kotlin) Re-Authentication Example

```kotlin
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await

suspend fun safeUpdateEmailAddress(
    currentPassword: String,
    newEmail: String
) {
    val user = FirebaseAuth.getInstance().currentUser 
        ?: throw IllegalStateException("User is not signed in.")
    val email = user.email 
        ?: throw IllegalStateException("User email unavailable.")

    val credential = EmailAuthProvider.getCredential(email, currentPassword)

    try {
        // Re-authenticate user before email update
        user.reauthenticate(credential).await()
        user.updateEmail(newEmail).await()
        user.sendEmailVerification().await()
    } catch (e: Exception) {
        throw e
    }
}
```

---

## Security Rules Enforcement

Always back client authentication checks with backend security rules in Firestore to prevent unauthorized data access.

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function checking if caller is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function checking if caller owns the target UID document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User profile document rules (`users/{userId}`)
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Verified email requirement for sensitive documents
    match /verified_content/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.token.email_verified == true;
    }
  }
}
```

---

### Summary Checklist for Production Auth Integration

- [x] **Real-time State Listening**: Always clean up listeners via `unsubscribe()` / `removeAuthStateListener()` / `onDispose`.
- [x] **Zero Mock Integrity**: Do not inject silent fake users or mock transaction data on Auth failures; surface clean, actionable typed errors.
- [x] **Profile Updates**: Call `user.reload()` immediately after updating profile properties or emails to refresh local cached tokens.
- [x] **Firestore Document Pairing**: Keep core auth (`uid`, `email`) in Auth SDK and extended custom application state in `users/{uid}` in Firestore with real-time `onSnapshot` / `addSnapshotListener`.
- [x] **Re-Authentication**: Intercept `auth/requires-recent-login` explicitly and guide user through re-authentication before sensitive state modifications.
- [x] **Backend Validation**: Guard all endpoints and documents using `request.auth.uid` in Firestore Security Rules.
