package components.features.auth

import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialProviderConfigurationException
import components.features.catalog.DiscoveredListing
import components.features.catalog.MerchantHandoffState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.junit.runner.RunWith

@RunWith(RobolectricTestRunner::class)
class PlatformPasskeyRegistrarTest {
    @Test
    fun returnsRegistrationResponseAfterCredentialManagerCreatesPasskey() = runTest {
        val registrar =
            PlatformPasskeyRegistrar(activity) {
                CreatePublicKeyCredentialResponse("""{"id":"credential-123","type":"public-key"}""")
            }

        val result =
            registrar.register(
                PasskeyRegistrationRequest.Ready(
                    requestJson = requestJson,
                    completeRegistration = { PasskeyRegistrationResult.Registered },
                ),
            )

        assertEquals(PasskeyRegistrationResult.Registered, result)
    }

    @Test
    fun returnsCancelledWhenUserDismissesCredentialManager() = runTest {
        val registrar =
            PlatformPasskeyRegistrar(activity) {
                throw CreateCredentialCancellationException()
            }

        val result = registrar.register(PasskeyRegistrationRequest.Ready(requestJson) { PasskeyRegistrationResult.Registered })

        assertEquals(PasskeyRegistrationResult.Cancelled, result)
    }

    @Test
    fun returnsProviderFailureWhenCredentialProviderIsUnavailable() = runTest {
        val registrar =
            PlatformPasskeyRegistrar(activity) {
                throw CreateCredentialProviderConfigurationException()
            }

        val result = registrar.register(PasskeyRegistrationRequest.Ready(requestJson) { PasskeyRegistrationResult.Registered })

        assertIs<PasskeyRegistrationResult.ProviderFailure>(result)
    }

    @Test
    fun missingRegistrationBackendDoesNotCompleteOnboardingOrInvokeCredentialManager() = runTest {
        var credentialManagerInvoked = false
        val registrar =
            PlatformPasskeyRegistrar(activity) {
                credentialManagerInvoked = true
                error("Credential Manager must not run without server registration options")
            }

        val result = registrar.register(PasskeyRegistrationRequest.BackendUnavailable)
        val state = PasskeyRegistrationState().after(result)

        assertEquals(PasskeyRegistrationResult.BackendUnavailable, result)
        assertFalse(credentialManagerInvoked)
        assertFalse(state.isCompleted)
    }

    @Test
    fun biometricApprovalDoesNotCreatePurchaseSuccess() {
        val handoff = MerchantHandoffState(listing = listing).afterBiometricApproval()

        assertTrue(handoff.biometricApproved)
        assertFalse(handoff.purchaseConfirmed)
    }

    private companion object {
        val activity = Robolectric.buildActivity(android.app.Activity::class.java).setup().get()

        val requestJson =
            """
            {
              "challenge": "Y2hhbGxlbmdl",
              "rp": { "id": "get-spresso.web.app", "name": "Spresso" },
              "user": { "id": "dXNlci0xMjM0NTY3ODkwMTIzNA", "name": "user@example.com", "displayName": "Spresso shopper" },
              "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
              "authenticatorSelection": { "residentKey": "required", "userVerification": "required" }
            }
            """.trimIndent()

        val listing =
            DiscoveredListing(
                id = "parallel-5f6c9a01",
                name = "Travel Mug",
                merchantUrl = "https://merchant.example/products/travel-mug",
                source = "parallel",
                discoveredAt = "2026-08-30T12:00:00Z",
            )
    }
}
