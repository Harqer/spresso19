package components.features.auth

import components.models.*
import components.features.auth.widgets.SocialAuthButtons

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import components.core.LogoSize
import components.core.SpressoLogo
import kotlinx.coroutines.launch
import network.signInWithEmailAndPassword
import network.createUserWithEmailAndPassword
import network.signInWithGoogle

/**
 * AuthPage Template.
 * Responsive layout with official brand assets and identical Web UI parity.
 */
@Composable
fun AuthPage(
    initialMode: String = "signin",
    onSuccess: () -> Unit = {},
    onGoogleSignInRequested: (() -> Unit)? = null,
    onPhoneSignInRequested: (() -> Unit)? = null
) {
    var mode by remember { mutableStateOf(initialMode) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }

    val scrollState = rememberScrollState()
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()



    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surface)
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Spacer(modifier = Modifier.height(48.dp))

                Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    SpressoLogo(size = LogoSize.Large, showText = true)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Column(
                    modifier = Modifier.widthIn(max = 400.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    SocialAuthButtons(
                        onGoogleSignInRequested = {
                            coroutineScope.launch {
                                val success = signInWithGoogle()
                                if (success) {
                                    onSuccess()
                                } else {
                                    snackbarHostState.showSnackbar("Google Sign in failed")
                                }
                            }
                        },
                        onPhoneSignInRequested = {
                            if (onPhoneSignInRequested != null) onPhoneSignInRequested()
                        }
                    )

                    Text("─── OR ───", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 4.dp))

                    if (mode == "register") {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Full name") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(25.dp),
                            singleLine = true
                        )
                    }

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email address") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(25.dp),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(25.dp),
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            if (email.isNotBlank() && password.isNotBlank()) {
                                coroutineScope.launch {
                                    if (mode == "signin") {
                                        val success = signInWithEmailAndPassword(email, password)
                                        if (success) onSuccess() else snackbarHostState.showSnackbar("Sign in failed. Please try again.")
                                    } else {
                                        val success = createUserWithEmailAndPassword(email, password)
                                        if (success) onSuccess() else snackbarHostState.showSnackbar("Account creation failed. Please try again.")
                                    }
                                }
                            } else {
                                coroutineScope.launch {
                                    snackbarHostState.showSnackbar("Please fill out all fields")
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(25.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary)
                    ) {
                        Text(if (mode == "signin") "Continue" else "Create Account", style = MaterialTheme.typography.labelLarge)
                    }
                    
                    TextButton(onClick = { mode = if (mode == "signin") "register" else "signin" }) {
                        Text(
                            text = if (mode == "signin") "Don't have an account? Sign up" else "Already have an account? Sign in",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(48.dp))
            }

            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Terms of use", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("|", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Privacy policy", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
