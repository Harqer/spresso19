package com.spresso19

/** App consent and system enablement are independent facts. */
internal data class AccessibilityAccessState(
    val hasAppConsent: Boolean,
    val isSystemServiceEnabled: Boolean,
) {
    fun canOpenSystemSettings(): Boolean = hasAppConsent

    fun canCapture(): Boolean = hasAppConsent && isSystemServiceEnabled
}
