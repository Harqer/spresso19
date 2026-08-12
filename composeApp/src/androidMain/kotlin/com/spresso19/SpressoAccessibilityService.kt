package com.spresso19

import android.accessibilityservice.AccessibilityButtonController
import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.util.Base64
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import android.widget.Toast
import androidx.annotation.RequiresApi
import java.io.ByteArrayOutputStream
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.sqrt
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import network.ApiClient

/**
 * Non-tool, user-triggered shopping screen search.
 *
 * This service deliberately does not inspect or act on accessibility events. It
 * uses window access only at the moment of a visible scan request to identify
 * the focused window and reject sensitive signals before the official
 * screenshot API is called. `canTakeScreenshot`, interactive-window retrieval,
 * and window-content access are retained solely for that narrow one-shot path.
 */
class SpressoAccessibilityService : AccessibilityService() {

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.IO)
    private val apiClient = ApiClient()
    private lateinit var consentStore: AccessibilityConsentStore
    private val captureGate = AccessibilityCaptureGate()
    private val captureInProgress = AtomicBoolean(false)
    private var commandReceiverRegistered = false
    private var accessibilityButtonController: AccessibilityButtonController? = null

    private val commandReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                AccessibilityServiceCommands.ACTION_REVOKE_CONSENT -> {
                    consentStore.revokeConsent()
                    disableSelf()
                }
                AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN -> {
                    val token = intent.getStringExtra(AccessibilityServiceCommands.EXTRA_REQUEST_TOKEN)
                        ?: return
                    val requestedAt = intent.getLongExtra(
                        AccessibilityServiceCommands.EXTRA_REQUESTED_AT,
                        Long.MIN_VALUE
                    )
                    val displayId = intent.getIntExtra(
                        AccessibilityServiceCommands.EXTRA_DISPLAY_ID,
                        Display.DEFAULT_DISPLAY
                    )
                    handleExplicitRequest(
                        ExplicitCaptureRequest(token, requestedAt),
                        displayId
                    )
                }
            }
        }
    }

    private val accessibilityButtonCallback = object : AccessibilityButtonController.AccessibilityButtonCallback() {
        override fun onClicked(controller: AccessibilityButtonController) {
            // The system accessibility button is a fresh, explicit user action.
            handleExplicitRequest(
                ExplicitCaptureRequest(UUID.randomUUID().toString(), System.currentTimeMillis()),
                Display.DEFAULT_DISPLAY
            )
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        consentStore = AccessibilityConsentStore(this)
        if (!consentStore.hasCurrentConsent() || !AccessibilityServiceState.isExactServiceEnabled(this)) {
            disableSelf()
            return
        }

        // The feature never consumes events. Clear the framework's event mask
        // at runtime as an additional guard against future metadata changes.
        serviceInfo?.let {
            it.eventTypes = 0
            setServiceInfo(it)
        }
        registerCommandReceiver()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            accessibilityButtonController = getAccessibilityButtonController().also {
                it.registerAccessibilityButtonCallback(accessibilityButtonCallback)
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Intentionally inert: screen search never starts from an accessibility event.
    }

    override fun onInterrupt() {
        // No background work or capture is started on interruption.
    }

    private fun registerCommandReceiver() {
        if (commandReceiverRegistered) return
        val filter = IntentFilter().apply {
            addAction(AccessibilityServiceCommands.ACTION_REQUEST_SCREEN_SCAN)
            addAction(AccessibilityServiceCommands.ACTION_REVOKE_CONSENT)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(commandReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(commandReceiver, filter)
        }
        commandReceiverRegistered = true
    }

    private fun handleExplicitRequest(request: ExplicitCaptureRequest, displayId: Int) {
        if (!::consentStore.isInitialized) return
        val consented = consentStore.hasCurrentConsent()
        val serviceEnabled = AccessibilityServiceState.isExactServiceEnabled(this)
        if (!captureGate.accept(request, consented, serviceEnabled)) return
        if (!captureInProgress.compareAndSet(false, true)) {
            captureGate.complete(request)
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            captureFocusedWindow(request)
        } else {
            captureDisplay(request, displayId)
        }
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private fun captureFocusedWindow(request: ExplicitCaptureRequest) {
        val target = findFocusedWindow()
        if (target == null) {
            finishRequest(request, "This screen is not available for search.")
            return
        }
        if (target.isSensitive) {
            finishRequest(request, "This screen may contain sensitive information and cannot be searched.")
            return
        }
        if (!isRequestStillAllowed(request)) {
            finishRequest(request, null)
            return
        }

        takeScreenshotOfWindow(
            target.windowId,
            mainExecutor,
            screenshotCallback(request)
        )
    }

    private fun captureDisplay(request: ExplicitCaptureRequest, displayId: Int) {
        val target = findFocusedWindow()
        if (target?.isSensitive == true) {
            finishRequest(request, "This screen may contain sensitive information and cannot be searched.")
            return
        }
        if (!isRequestStillAllowed(request)) {
            finishRequest(request, null)
            return
        }

        takeScreenshot(displayId, mainExecutor, screenshotCallback(request))
    }

    private fun screenshotCallback(request: ExplicitCaptureRequest): TakeScreenshotCallback =
        object : TakeScreenshotCallback {
            override fun onSuccess(screenshot: ScreenshotResult) {
                if (!isRequestStillAllowed(request)) {
                    finishRequest(request, null)
                    return
                }
                serviceScope.launch(Dispatchers.Default) {
                    processScreenshot(request, screenshot)
                }
            }

            override fun onFailure(errorCode: Int) {
                finishRequest(request, AccessibilityScreenshotPolicy.userMessageForFailure(errorCode))
            }
        }

    private suspend fun processScreenshot(request: ExplicitCaptureRequest, screenshot: ScreenshotResult) {
        var hardwareBitmap: Bitmap? = null
        var softwareBitmap: Bitmap? = null
        try {
            if (!isRequestStillAllowed(request)) return
            val buffer = screenshot.hardwareBuffer ?: return
            try {
                hardwareBitmap = Bitmap.wrapHardwareBuffer(buffer, screenshot.colorSpace)
                softwareBitmap = hardwareBitmap?.copy(Bitmap.Config.ARGB_8888, false)
            } finally {
                buffer.close()
            }

            val source = softwareBitmap ?: return
            val imageBytes = encodeBoundedJpeg(source) ?: run {
                notifyUser("This screen is too large to search safely.")
                return
            }
            val base64Image = Base64.encodeToString(imageBytes, Base64.NO_WRAP)
            if (!isRequestStillAllowed(request)) return

            val response = try {
                withTimeout(UPLOAD_TIMEOUT_MILLIS) {
                    apiClient.performAccessibilityLensSearch(base64Image)
                }
            } catch (_: CancellationException) {
                throw CancellationException()
            } catch (_: Exception) {
                null
            }

            if (response?.success == true) {
                notifyUser("Screen search complete.")
            } else {
                notifyUser("Unable to search this screen. Please try again.")
            }
        } finally {
            softwareBitmap?.recycle()
            hardwareBitmap?.recycle()
            captureInProgress.set(false)
            captureGate.complete(request)
        }
    }

    private fun isRequestStillAllowed(request: ExplicitCaptureRequest): Boolean =
        captureGate.isActiveAndFresh(
            request,
            consentStore.hasCurrentConsent(),
            AccessibilityServiceState.isExactServiceEnabled(this)
        )

    private fun finishRequest(request: ExplicitCaptureRequest, message: String?) {
        captureInProgress.set(false)
        captureGate.complete(request)
        if (message != null) notifyUser(message)
    }

    private data class TargetWindow(val windowId: Int, val isSensitive: Boolean)

    private fun findFocusedWindow(): TargetWindow? {
        val availableWindows = try {
            windows
        } catch (_: SecurityException) {
            return null
        }
        val target = availableWindows.firstOrNull { it.isFocused }
            ?: availableWindows.firstOrNull { it.isActive }
            ?: availableWindows.firstOrNull()
        if (target == null) {
            availableWindows.forEach { recycleWindow(it) }
            return null
        }

        val root = try {
            target.root
        } catch (_: RuntimeException) {
            null
        }
        val packageName = root?.packageName?.toString()
        val sensitive = isSensitivePackage(packageName) || (root != null && containsSensitiveNode(root))
        if (root != null) {
            recycleNode(root)
        }
        val result = TargetWindow(target.id, sensitive)
        availableWindows.forEach { recycleWindow(it) }
        return result
    }

    private fun containsSensitiveNode(node: AccessibilityNodeInfo, depth: Int = 0, budget: IntArray = intArrayOf(MAX_NODE_SCAN)): Boolean {
        if (depth > MAX_NODE_DEPTH || budget[0]-- <= 0) return false
        if (node.isPassword || isPasswordInput(node.inputType)) return true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && node.isAccessibilityDataSensitive) {
            return true
        }
        val nodeLabels = listOfNotNull(
            node.className?.toString(),
            node.viewIdResourceName,
            node.text?.toString(),
            node.contentDescription?.toString()
        ).joinToString(" ").lowercase()
        if (SENSITIVE_NODE_MARKERS.any { nodeLabels.contains(it) }) return true
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            val sensitive = try {
                containsSensitiveNode(child, depth + 1, budget)
            } finally {
                recycleNode(child)
            }
            if (sensitive) return true
        }
        return false
    }

    private fun isSensitivePackage(packageName: String?): Boolean {
        val normalized = packageName?.lowercase() ?: return false
        return SENSITIVE_PACKAGE_MARKERS.any { normalized.contains(it) }
    }

    private fun isPasswordInput(inputType: Int): Boolean {
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
            variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
            variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
            variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
    }

    private fun encodeBoundedJpeg(source: Bitmap): ByteArray? {
        var candidate = scaleToBounds(source)
        try {
            repeat(MAX_COMPRESSION_ATTEMPTS) {
                for (quality in JPEG_QUALITIES) {
                    val bytes = ByteArrayOutputStream().use { stream ->
                        if (!candidate.compress(Bitmap.CompressFormat.JPEG, quality, stream)) {
                            return@use ByteArray(0)
                        }
                        stream.toByteArray()
                    }
                    if (bytes.isNotEmpty() && bytes.size <= MAX_IMAGE_BYTES) return bytes
                }
                val nextWidth = (candidate.width * 0.75f).toInt().coerceAtLeast(1)
                val nextHeight = (candidate.height * 0.75f).toInt().coerceAtLeast(1)
                val next = Bitmap.createScaledBitmap(candidate, nextWidth, nextHeight, true)
                if (next !== candidate) candidate.recycle()
                candidate = next
            }
            return null
        } finally {
            if (candidate !== source) candidate.recycle()
        }
    }

    private fun scaleToBounds(source: Bitmap): Bitmap {
        val pixelCount = source.width.toLong() * source.height.toLong()
        val longestSide = maxOf(source.width, source.height)
        val scale = minOf(
            1.0,
            MAX_IMAGE_DIMENSION.toDouble() / longestSide.toDouble(),
            sqrt(MAX_IMAGE_PIXELS.toDouble() / pixelCount.toDouble())
        )
        if (scale >= 1.0) return source
        return Bitmap.createScaledBitmap(
            source,
            (source.width * scale).toInt().coerceAtLeast(1),
            (source.height * scale).toInt().coerceAtLeast(1),
            true
        )
    }

    private fun notifyUser(message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        accessibilityButtonController?.unregisterAccessibilityButtonCallback(accessibilityButtonCallback)
        accessibilityButtonController = null
        if (commandReceiverRegistered) {
            try {
                unregisterReceiver(commandReceiver)
            } catch (_: IllegalArgumentException) {
                // Already unregistered by the framework.
            }
            commandReceiverRegistered = false
        }
        serviceScope.cancel()
        apiClient.close()
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    private fun recycleWindow(window: AccessibilityWindowInfo) {
        window.recycle()
    }

    @Suppress("DEPRECATION")
    private fun recycleNode(node: AccessibilityNodeInfo) {
        node.recycle()
    }

    companion object {
        private const val MAX_IMAGE_DIMENSION = 2_048
        private const val MAX_IMAGE_PIXELS = 4_000_000L
        private const val MAX_IMAGE_BYTES = 1_500_000
        private const val MAX_COMPRESSION_ATTEMPTS = 4
        private const val MAX_NODE_DEPTH = 20
        private const val MAX_NODE_SCAN = 500
        private const val UPLOAD_TIMEOUT_MILLIS = 20_000L
        private val JPEG_QUALITIES = intArrayOf(85, 75, 65)
        private val SENSITIVE_PACKAGE_MARKERS = setOf(
            "bank", "wallet", "payment", "finance", "health", "medical", "clinic",
            "hospital", "password", "auth", "otp", "authenticator", "message", "chat",
            "mail", "email", "private", "secure", "login", "credential"
        )
        private val SENSITIVE_NODE_MARKERS = setOf(
            "password", "passcode", "one-time", "otp", "verification code", "security code",
            "credit card", "debit card", "payment", "bank account", "routing number", "health",
            "medical", "private message", "authentication", "sign in", "log in", "credential"
        )
    }
}
