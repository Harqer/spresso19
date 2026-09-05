package com.spresso

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import theme.AppTheme

/** The service-specific settings screen exposed from Android Accessibility settings. */
class AccessibilitySettingsActivity : ComponentActivity() {
    private lateinit var consentStore: AccessibilityConsentStore
    private var hasConsent by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        consentStore = AccessibilityConsentStore(this)
        hasConsent = consentStore.hasCurrentConsent()

        setContent {
            AppTheme {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text("Spresso screen search", style = MaterialTheme.typography.headlineSmall)
                    Text(
                        if (hasConsent) {
                            "Screen search consent is on. Spresso captures only after you request a one-time search."
                        } else {
                            "Screen search consent is off. Spresso will not capture a screen."
                        },
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    if (hasConsent) {
                        TextButton(onClick = ::revokeConsent) {
                            Text("Revoke screen search consent")
                        }
                    }
                    Button(onClick = ::finish) {
                        Text("Done")
                    }
                }
            }
        }
    }

    private fun revokeConsent() {
        consentStore.revokeConsent()
        hasConsent = false
        sendBroadcast(
            Intent(AccessibilityServiceCommands.ACTION_REVOKE_CONSENT)
                .setPackage(packageName),
        )
        Toast.makeText(this, "Screen search consent revoked", Toast.LENGTH_SHORT).show()
    }
}
