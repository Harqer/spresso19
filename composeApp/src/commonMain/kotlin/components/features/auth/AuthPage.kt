package components.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import components.core.LogoSize
import components.core.SpressoLogo
import components.features.auth.widgets.SocialAuthButtons
import kotlinx.coroutines.launch
import network.createUserWithEmailAndPassword
import network.reloadCurrentUser
import network.sendPasswordResetEmail
import network.signInWithEmailAndPassword

/**
 * AuthPage Template (auth correction scope).
 *
 * Sign-up: full name + email + password → Firebase createUser →
 * updateProfile(displayName) → sendEmailVerification. The root state machine
 * then drives the verification gate and canonical bootstrap — this screen
 * NEVER navigates directly to Home/Chat, and never creates a Convex user.
 *
 * Sign-in: email + password → Firebase; the auth-state listener pushes the
 * fresh ID token into the Convex client session; the root state machine
 * takes over. Same for Google (MainActivity CredentialManager path) and
 * phone (FirebaseUI) — all providers converge on one Convex identity path.
 *
 * Forgot password: Firebase sendPasswordResetEmail → generic confirmation
 * (no account enumeration) → back to sign in. No Convex mutation involved.
 */
@Composable
@Suppress("UNUSED_PARAMETER")
fun AuthPage(
    initialMode: String = "signin",
    onSuccess: () -> Unit = {},
    onGoogleSignInRequested: (() -> Unit)? = null,
    onPhoneSignInRequested: (() -> Unit)? = null,
) {
    var mode by remember { mutableStateOf(initialMode) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var showForgotPassword by remember { mutableStateOf(false) }
    var resetEmailSent by remember { mutableStateOf(false) }

    val scrollState = rememberScrollState()
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    suspend fun refreshVerificationGate() {
        // After account creation the user must verify; reload mints a fresh
        // token so the root gate re-evaluates against Firebase's truth.
        reloadCurrentUser()
        onSuccess()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(innerPadding)
                    .consumeWindowInsets(innerPadding),
        ) {
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Spacer(modifier = Modifier.height(48.dp))

                Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    SpressoLogo(size = LogoSize.Large, showText = true)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Column(
                    modifier = Modifier.widthIn(max = 400.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    SocialAuthButtons(
                        onGoogleSignInRequested = {
                            // One Google path: the platform host owns it
                            // (Android CredentialManager in MainActivity).
                            onGoogleSignInRequested?.invoke()
                        },
                        onPhoneSignInRequested = {
                            if (onPhoneSignInRequested != null) onPhoneSignInRequested()
                        },
                    )

                    Text(
                        "─── OR ───",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )

                    if (showForgotPassword) {
                        // Password recovery: Firebase reset email → generic
                        // confirmation → back to sign in. Nothing touches Convex.
                        Text(
                            text = if (resetEmailSent) {
                                "If an account exists for that address, a reset link is on its way."
                            } else {
                                "Enter your account email and we'll send a reset link."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (!resetEmailSent) {
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("Email address") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(25.dp),
                                singleLine = true,
                            )
                            Button(
                                onClick = {
                                    coroutineScope.launch {
                                        busy = true
                                        val sent = sendPasswordResetEmail(email)
                                        busy = false
                                        if (sent) {
                                            resetEmailSent = true
                                        } else {
                                            snackbarHostState.showSnackbar("Could not send a reset email. Please try again.")
                                        }
                                    }
                                },
                                enabled = !busy && email.isNotBlank(),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                shape = RoundedCornerShape(25.dp),
                            ) {
                                Text("Send reset link", style = MaterialTheme.typography.labelLarge)
                            }
                        }
                        TextButton(onClick = { showForgotPassword = false; resetEmailSent = false }) {
                            Text("Back to sign in", style = MaterialTheme.typography.labelMedium)
                        }
                    } else {
                        if (mode == "register") {
                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it },
                                label = { Text("Full name") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(25.dp),
                                singleLine = true,
                            )
                        }

                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("Email address") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(25.dp),
                            singleLine = true,
                        )

                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = { Text("Password") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(25.dp),
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                if (email.isNotBlank() && password.isNotBlank() && (mode == "signin" || name.isNotBlank())) {
                                    coroutineScope.launch {
                                        busy = true
                                        if (mode == "signin") {
                                            val success = signInWithEmailAndPassword(email, password)
                                            busy = false
                                            // No direct navigation: the Firebase
                                            // auth-state listener starts the Convex
                                            // session and the root state machine
                                            // re-renders from it.
                                            if (success) onSuccess() else snackbarHostState.showSnackbar("Sign in failed. Please try again.")
                                        } else {
                                            val success = createUserWithEmailAndPassword(email, password, name.trim())
                                            busy = false
                                            if (success) {
                                                refreshVerificationGate()
                                            } else {
                                                snackbarHostState.showSnackbar("Account creation failed. Please try again.")
                                            }
                                        }
                                    }
                                } else {
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar("Please fill out all fields")
                                    }
                                }
                            },
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(25.dp),
                            colors =
                                ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                        ) {
                            Text(if (mode == "signin") "Continue" else "Create Account", style = MaterialTheme.typography.labelLarge)
                        }

                        if (mode == "signin") {
                            TextButton(onClick = { showForgotPassword = true }) {
                                Text("Forgot password?", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }

                    if (!showForgotPassword) {
                        TextButton(onClick = { mode = if (mode == "signin") "register" else "signin" }) {
                            Text(
                                text = if (mode == "signin") "Don't have an account? Sign up" else "Already have an account? Sign in",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(48.dp))
            }

            Row(
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("Terms of use", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("|", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Privacy policy", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
