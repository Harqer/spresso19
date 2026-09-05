package com.spresso

import android.accessibilityservice.AccessibilityService

internal object AccessibilityScreenshotPolicy {
    fun userMessageForFailure(errorCode: Int): String =
        when (errorCode) {
            AccessibilityService.ERROR_TAKE_SCREENSHOT_SECURE_WINDOW ->
                "This screen is protected and cannot be searched."
            AccessibilityService.ERROR_TAKE_SCREENSHOT_INVALID_WINDOW,
            AccessibilityService.ERROR_TAKE_SCREENSHOT_INVALID_DISPLAY,
            AccessibilityService.ERROR_TAKE_SCREENSHOT_NO_ACCESSIBILITY_ACCESS,
            ->
                "This screen is not available for search."
            else -> "Unable to search this screen right now."
        }
}
