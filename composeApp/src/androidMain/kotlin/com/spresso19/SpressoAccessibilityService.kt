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

/**
 * Official Android Accessibility Service for Spresso Visual Assistant.
 * Built according to official Android Developer Documentation (API 30+ takeScreenshot).
 */
class SpressoAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.Main)
    private val apiClient = ApiClient()

    override fun onServiceConnected() {
        super.onServiceConnected()
        Toast.makeText(this, "Spresso Visual Assistant Connected", Toast.LENGTH_SHORT).show()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Event monitoring for interactive screen changes
    }

    override fun onInterrupt() {
        Toast.makeText(this, "Spresso Visual Assistant Interrupted", Toast.LENGTH_SHORT).show()
    }

    /**
     * Captures a screenshot using official AccessibilityService API (Android 11+ / API 30+).
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
                        buffer?.close()
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
}
