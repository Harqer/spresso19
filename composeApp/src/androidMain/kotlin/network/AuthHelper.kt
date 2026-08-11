package network

import com.google.firebase.auth.FirebaseAuth

actual fun getCurrentUserUid(): String? = FirebaseAuth.getInstance().currentUser?.uid
