package com.spresso19

import App
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import java.util.UUID

class MainActivity : ComponentActivity() {

    private val recordAudioRequestCode = 101
    private val isAccessibilityEnabledState = mutableStateOf(false)
    private val hasAccessibilityConsentState = mutableStateOf(false)
    private val accessibilityDisclosureRequestedState = mutableStateOf(false)
    private lateinit var accessibilityConsentStore: AccessibilityConsentStore

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        accessibilityConsentStore = AccessibilityConsentStore(this)
        if (savedInstanceState == null && isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
        }
        refreshAccessibilityState()
        verifyAppSignature()

        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        checkAndRequestAudioPermission()

        setContent {
            val darkTheme = isSystemInDarkTheme()
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            controller.isAppearanceLightStatusBars = !darkTheme
            controller.isAppearanceLightNavigationBars = !darkTheme

            val isAccessEnabled by isAccessibilityEnabledState
            val hasConsent by hasAccessibilityConsentState
            val showDisclosure by accessibilityDisclosureRequestedState

            App(
                onShare = { productId ->
                    val sendIntent = Intent().apply {
                        action = Intent.ACTION_SEND
                        putExtra(Intent.EXTRA_TEXT, "Check out this product on Spresso19! Product ID: $productId")
                        type = "text/plain"
                    }
                    startActivity(Intent.createChooser(sendIntent, null))
                },
                isAccessibilityEnabled = isAccessEnabled,
                hasAccessibilityConsent = hasConsent,
                showAccessibilityDisclosure = showDisclosure,
                onToggleAccessibility = ::requestAccessibilitySettingsOrDisclosure,
                onAccessibilityConsentAccepted = ::acceptAccessibilityConsent,
                onDismissAccessibilityDisclosure = {
                    accessibilityDisclosureRequestedState.value = false
                },
                onRevokeAccessibilityConsent = ::revokeAccessibilityConsent,
                onRequestAccessibilityScan = ::requestOneShotScreenScan
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (isAccessibilityDisclosureIntent(intent)) {
            accessibilityDisclosureRequestedState.value = true
        }
    }

    override fun onResume() {
        super.onResume()
        if (::accessibilityConsentStore.isInitialized) {
            refreshAccessibilityState()
        }
    }

    private fun isAccessibilityDisclosureIntent(intent: Intent?): Boolean =
        intent?.getBooleanExtra(EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE, false) == true ||
            intent?.getBooleanExtra("open_lens", false) == true

    private fun refreshAccessibilityState() {
        hasAccessibilityConsentState.value = accessibilityConsentStore.hasCurrentConsent()
        isAccessibilityEnabledState.value = AccessibilityServiceState.isExactServiceEnabled(this)
    }

    private fun requestAccessibilitySettingsOrDisclosure() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        openAccessibilitySettings()
    }

    private fun acceptAccessibilityConsent() {
        accessibilityConsentStore.grantCurrentConsent()
        hasAccessibilityConsentState.value = true
        accessibilityDisclosureRequestedState.value = false
        // This is reached only from the disclosure's affirmative action.
        openAccessibilitySettings()
    }

    private fun openAccessibilitySettings() {
        val accessState = AccessibilityAccessState(
            hasAppConsent = accessibilityConsentStore.hasCurrentConsent(),
            isSystemServiceEnabled = AccessibilityServiceState.isExactServiceEnabled(this)
        )
        if (!accessState.canOpenSystemSettings()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        try {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        } catch (_: Exception) {
            Toast.makeText(
                this,
                "Accessibility settings are unavailable on this device.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun revokeAccessibilityConsent() {
        accessibilityConsentStore.revokeConsent()
        hasAccessibilityConsentState.value = false
        sendBroadcast(
            Intent(AccessibilityServiceCommands.ACTION_REVOKE_CONSENT)
                .setPackage(packageName)
        )
        refreshAccessibilityState()
    }

    private fun requestOneShotScreenScan() {
        if (!accessibilityConsentStore.hasCurrentConsent()) {
            accessibilityDisclosureRequestedState.value = true
            return
        }
        val accessState = AccessibilityAccessState(
            hasAppConsent = accessibilityConsentStore.hasCurrentConsent(),
            isSystemServiceEnabled = AccessibilityServiceState.isExactServiceEnabled(this)
        )
        if (!accessState.canCapture()) {
            Toast.makeText(
                this,
                "Turn on Spresso screen search in Android settings first.",
                Toast.LENGTH_SHORT
            ).show()
            return
        }

        // A new token and timestamp are created for every visible scan action.
        sendBroadcast(
            Intent(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN)
                .setPackage(packageName)
                .putExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN, UUID.randomUUID().toString())
                .putExtra(AccessibilityServiceCommands.EXTRA_REQUESTED_AT, System.currentTimeMillis())
                .putExtra(AccessibilityServiceCommands.EXTRA_DISPLAY_ID, android.view.Display.DEFAULT_DISPLAY)
        )
    }

    private fun checkAndRequestAudioPermission() {
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                recordAudioRequestCode
            )
        }
    }

    private fun verifyAppSignature() {
        try {
            val signatures: Array<out android.content.pm.Signature>? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                val packageInfo = packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
                val signingInfo = packageInfo.signingInfo ?: return
                if (signingInfo.hasMultipleSigners()) {
                    signingInfo.apkContentsSigners
                } else {
                    signingInfo.signingCertificateHistory
                }
            } else {
                @Suppress("DEPRECATION")
                val packageInfo = packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }
            if (signatures == null) return

            val expectedSignatureHash = "58:4A:47:CB:92:6B:21:17:2C:83:4F:5B:3F:F6:CD:C2:C8:68:AE:93:FA:F9:36:6E:4F:1F:EA:2C:51:F2:48:72"
            var verified = false
            for (sig in signatures) {
                val md = java.security.MessageDigest.getInstance("SHA-256")
                md.update(sig.toByteArray())
                val currentHash = md.digest().joinToString(":") { String.format("%02X", it) }
                if (currentHash.equals(expectedSignatureHash, ignoreCase = true)) {
                    verified = true
                    break
                }
            }
            val isDebuggable = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
            if (!verified && !isDebuggable) {
                finishAffinity()
            }
        } catch (_: Exception) {
            val isDebuggable = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
            if (!isDebuggable) {
                finishAffinity()
            }
        }
    }

    companion object {
        const val EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE = "open_accessibility_disclosure"
    }
}
