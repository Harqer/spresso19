package com.spresso19

import App
import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat

import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {

    private val RECORD_AUDIO_REQUEST_CODE = 101

    private val isAccessibilityEnabledState = androidx.compose.runtime.mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
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
            
            App(
                onShare = { productId ->
                    val sendIntent = android.content.Intent().apply {
                        action = android.content.Intent.ACTION_SEND
                        putExtra(android.content.Intent.EXTRA_TEXT, "Check out this product on Spresso19! Product ID: $productId")
                        type = "text/plain"
                    }
                    val shareIntent = android.content.Intent.createChooser(sendIntent, null)
                    startActivity(shareIntent)
                },
                isAccessibilityEnabled = false,
                onToggleAccessibility = { }
            )
        }
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
                RECORD_AUDIO_REQUEST_CODE
            )
        }
    }

    private fun verifyAppSignature() {
        try {
            val packageInfo = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            }
            
            val signingInfo = packageInfo.signingInfo ?: return
            val signatures = if (signingInfo.hasMultipleSigners()) {
                signingInfo.apkContentsSigners
            } else {
                signingInfo.signingCertificateHistory
            } ?: return
            
            // Expected SHA-256 hash of our custom spresso.keystore certificate
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
                // Signature mismatch in release! Exit application to protect integrity.
                finishAffinity()
            }
        } catch (e: Exception) {
            val isDebuggable = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
            if (!isDebuggable) {
                finishAffinity()
            }
        }
    }
}
