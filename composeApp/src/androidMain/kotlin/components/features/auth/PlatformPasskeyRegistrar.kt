package components.features.auth

import android.app.Activity
import androidx.credentials.CreateCredentialResponse
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.CreateCredentialProviderConfigurationException

class PlatformPasskeyRegistrar(
    private val activity: Activity,
    private val createCredential: suspend (CreatePublicKeyCredentialRequest) -> CreateCredentialResponse = { request ->
        CredentialManager.create(activity).createCredential(activity, request)
    },
) {
    suspend fun register(request: PasskeyRegistrationRequest): PasskeyRegistrationResult =
        when (request) {
            PasskeyRegistrationRequest.BackendUnavailable -> PasskeyRegistrationResult.BackendUnavailable
            is PasskeyRegistrationRequest.Ready -> createCredential(request)
        }

    private suspend fun createCredential(request: PasskeyRegistrationRequest.Ready): PasskeyRegistrationResult =
        try {
            val response = createCredential(CreatePublicKeyCredentialRequest(request.requestJson))
            val passkeyResponse = response as? CreatePublicKeyCredentialResponse
                ?: return PasskeyRegistrationResult.ProviderFailure()
            try {
                request.completeRegistration(passkeyResponse.registrationResponseJson)
            } catch (_: Exception) {
                PasskeyRegistrationResult.BackendFailure()
            }
        } catch (_: CreateCredentialCancellationException) {
            PasskeyRegistrationResult.Cancelled
        } catch (_: CreateCredentialProviderConfigurationException) {
            PasskeyRegistrationResult.ProviderFailure()
        } catch (_: CreateCredentialException) {
            PasskeyRegistrationResult.ProviderFailure()
        } catch (_: IllegalArgumentException) {
            PasskeyRegistrationResult.ProviderFailure("Passkey setup could not start. Try again later.")
        }
}
