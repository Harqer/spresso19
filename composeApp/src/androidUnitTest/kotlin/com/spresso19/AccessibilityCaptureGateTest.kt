package com.spresso19

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccessibilityCaptureGateTest {
    @Test
    fun systemSettingsRequireStoredConsentButDoNotGrantIt() {
        assertFalse(AccessibilityAccessState(false, false).canOpenSystemSettings())
        assertTrue(AccessibilityAccessState(true, false).canOpenSystemSettings())
        assertFalse(AccessibilityAccessState(false, true).canCapture())
        assertFalse(AccessibilityAccessState(true, false).canCapture())
        assertTrue(AccessibilityAccessState(true, true).canCapture())
    }

    @Test
    fun consentAndExactEnabledStateAreRequired() {
        var now = 1_000L
        val gate = AccessibilityCaptureGate(nowMillis = { now })
        val request = ExplicitCaptureRequest("one", now)

        assertFalse(gate.accept(request, hasConsent = false, serviceEnabled = true))
        assertFalse(gate.accept(request, hasConsent = true, serviceEnabled = false))
        assertTrue(gate.accept(request, hasConsent = true, serviceEnabled = true))
    }

    @Test
    fun denialNeverOpensOrStartsARequest() {
        val gate = AccessibilityCaptureGate(nowMillis = { 1_000L })
        val request = ExplicitCaptureRequest("denied", 1_000L)

        assertFalse(gate.accept(request, hasConsent = false, serviceEnabled = false))
        assertFalse(gate.isActiveAndFresh(request, hasConsent = true, serviceEnabled = true))
    }

    @Test
    fun eachRequestIsFreshAndOneShot() {
        var now = 1_000L
        val gate = AccessibilityCaptureGate(nowMillis = { now })
        val request = ExplicitCaptureRequest("one", now)

        assertTrue(gate.accept(request, hasConsent = true, serviceEnabled = true))
        assertFalse(gate.accept(request, hasConsent = true, serviceEnabled = true))
        gate.complete(request)
        assertFalse(gate.accept(request, hasConsent = true, serviceEnabled = true))

        now += AccessibilityCaptureGate.REQUEST_LIFETIME_MILLIS + 1
        val expired = ExplicitCaptureRequest("two", 1_000L)
        assertFalse(gate.accept(expired, hasConsent = true, serviceEnabled = true))
    }

    @Test
    fun secureWindowIsNeverPresentedAsAUsableCapture() {
        assertEquals(
            "This screen is protected and cannot be searched.",
            AccessibilityScreenshotPolicy.userMessageForFailure(
                android.accessibilityservice.AccessibilityService.ERROR_TAKE_SCREENSHOT_SECURE_WINDOW
            )
        )
    }
}
