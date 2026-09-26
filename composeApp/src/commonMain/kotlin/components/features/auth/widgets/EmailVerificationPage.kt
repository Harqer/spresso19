package components.features.auth.widgets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.core.SpressoLogo
import components.core.LogoSize
import kotlinx.coroutines.launch
import network.reloadCurrentUser
import network.sendEmailVerification

/**
 * Dedicated email-verification gate (auth correction scope).
 *
 * Firebase remains authoritative: there is no second mutable emailVerified
 * flag in Convex. "Resend" triggers FirebaseUser.sendEmailVerification();
 * "I've verified" reloads the Firebase user, mints a fresh ID token (the
 * Convex session picks up the refreshed token), and the root state machine
 * re-evaluates the gate. The user signs out from here when stuck.
 */
@Composable
fun EmailVerificationPage(
    email: String?,
    onVerified: () -> Unit,
    onSignOut: () -> Unit,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }

    Scaffold(
        modifier = Modifier.fillMaxSize().windowInsetsPadding(androidx.compose.foundation.layout.WindowInsets.safeDrawing),
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            SpressoLogo(size = LogoSize.Medium, showText = true)
            Spacer(modifier = Modifier.height(24.dp))
            Text("Verify your email", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (email.isNullOrBlank()) {
                    "We sent a verification link to your inbox."
                } else {
                    "We sent a verification link to $email. Open it, then continue below."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    scope.launch {
                        busy = true
                        val reloaded = reloadCurrentUser()
                        busy = false
                        if (reloaded) {
                            onVerified()
                        } else {
                            snackbarHostState.showSnackbar("Could not refresh your account. Check your connection and try again.")
                        }
                    }
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(25.dp),
            ) {
                if (busy) CircularProgressIndicator(modifier = Modifier.height(20.dp)) else Text("I've verified")
            }
            OutlinedButton(
                onClick = {
                    scope.launch {
                        val sent = sendEmailVerification()
                        snackbarHostState.showSnackbar(
                            if (sent) "Verification email sent." else "Could not send the email. Try again shortly.",
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(25.dp),
            ) {
                Text("Resend email")
            }
            TextButton(onClick = onSignOut) {
                Text("Use a different account", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
