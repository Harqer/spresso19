package com.spresso19

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.util.Base64
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import network.ApiClient

import android.content.pm.PackageManager

class SpressoAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.Main)
    private val apiClient = ApiClient()

    override fun onServiceConnected() {
        super.onServiceConnected()
        if (!verifyCallerSignature()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                disableSelf()
            }
            return
        }
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_VIEW_CLICKED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            flags = AccessibilityServiceInfo.DEFAULT or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        this.serviceInfo = info
        Toast.makeText(this, "Spresso Accessibility Service Connected", Toast.LENGTH_SHORT).show()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Accessibility events monitoring for screen context shifts
    }

    override fun onInterrupt() {
        Toast.makeText(this, "Spresso Accessibility Service Interrupted", Toast.LENGTH_SHORT).show()
    }

    /**
     * Captures a screenshot of the current screen utilizing accessibility APIs,
     * base64 encodes the image, and requests visual search analysis from Spresso backend.
     */
    fun captureAndAnalyzeScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            takeScreenshot(
                Display.DEFAULT_DISPLAY,
                mainExecutor,
                object : TakeScreenshotCallback {
                    override fun onSuccess(screenshot: ScreenshotResult) {
                        val buffer = screenshot.hardwareBuffer
                        val colorSpace = screenshot.colorSpace
                        val bitmap = Bitmap.wrapHardwareBuffer(buffer, colorSpace)
                        
                        if (bitmap != null) {
                            // Copy hardware bitmap to software memory for compression
                            val softwareBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, false)
                            serviceScope.launch {
                                try {
                                    val stream = ByteArrayOutputStream()
                                    softwareBitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
                                    val byteArray = stream.toByteArray()
                                    val base64Image = Base64.encodeToString(byteArray, Base64.NO_WRAP)
                                    
                                    val response = apiClient.performLensSearch(base64Image)
                                    if (response.success && response.detectedResult != null) {
                                        val matchText = response.detectedResult.hudAnnotationText ?: "Object identified"
                                        Toast.makeText(
                                            this@SpressoAccessibilityService,
                                            "Spresso Screen Search: $matchText",
                                            Toast.LENGTH_LONG
                                        ).show()
                                    } else {
                                        Toast.makeText(
                                            this@SpressoAccessibilityService,
                                            "Spresso Screen Search: No matches found",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(
                                        this@SpressoAccessibilityService,
                                        "Screen search error: ${e.message}",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        }
                        buffer.close()
                    }

                    override fun onFailure(errorCode: Int) {
                        Toast.makeText(
                            this@SpressoAccessibilityService,
                            "Failed to capture screen: error code $errorCode",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            )
        } else {
            Toast.makeText(this, "Screen capture search requires Android 11+", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        apiClient.close()
    }

    private fun verifyCallerSignature(): Boolean {
        try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            }
            
            val signingInfo = packageInfo.signingInfo ?: return false
            val signatures = if (signingInfo.hasMultipleSigners()) {
                signingInfo.apkContentsSigners
            } else {
                signingInfo.signingCertificateHistory
            } ?: return false
            
            val expectedSignatureHash = "58:4A:47:CB:92:6B:21:17:2C:83:4F:5B:3F:F6:CD:C2:C8:68:AE:93:FA:F9:36:6E:4F:1F:EA:2C:51:F2:48:72"
            
            for (sig in signatures) {
                val md = java.security.MessageDigest.getInstance("SHA-256")
                md.update(sig.toByteArray())
                val currentHash = md.digest().joinToString(":") { String.format("%02X", it) }
                if (currentHash.equals(expectedSignatureHash, ignoreCase = true)) {
                    return true
                }
            }
        } catch (e: Exception) {
            return false
        }
        return false
    }
}
