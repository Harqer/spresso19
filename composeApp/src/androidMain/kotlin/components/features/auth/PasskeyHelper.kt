package components.features.auth

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CredentialManager
import androidx.credentials.exceptions.CreateCredentialException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

import network.ApiClient

@Composable
actual fun rememberPasskeyRegistrar(): PasskeyRegistrar {
    val context = LocalContext.current
    return remember(context) {
        object : PasskeyRegistrar {
            override suspend fun registerPasskey(): Pair<String, String> = withContext(Dispatchers.IO) {
                val credentialManager = CredentialManager.create(context)
                
                val apiClient = ApiClient()
                val dynamicChallenge = apiClient.generatePasskeyChallenge()
                
                if (dynamicChallenge.isEmpty()) {
                    apiClient.close()
                    throw IllegalStateException("Failed to generate dynamic WebAuthn challenge from backend")
                }

                // Note: In a real production app, this JSON would be fetched from the backend (Relying Party)
                // We construct a standard request JSON for CredentialManager here.
                val requestJson = """
                    {
                        "challenge": "$dynamicChallenge",
                            "rp": {
                                "id": "spresso-5561f.web.app",
                                "name": "Spresso"
                            },
                            "user": {
                                "id": "12345678",
                                "name": "user@spresso-5561f.web.app",
                                "displayName": "User"
                            },
                        "pubKeyCredParams": [
                            {
                                "type": "public-key",
                                "alg": -7
                            }
                        ],
                        "timeout": 60000,
                        "authenticatorSelection": {
                            "authenticatorAttachment": "platform",
                            "requireResidentKey": true
                        }
                    }
                """.trimIndent()

                val request = CreatePublicKeyCredentialRequest(requestJson)
                
                try {
                    val result = credentialManager.createCredential(
                        context as Activity,
                        request
                    )
                    
                    // The result contains the registration response JSON
                    // We extract the base64 credentialId and publicKey here
                    // (Using placeholders for the actual parsing logic of the CreatePublicKeyCredentialResponse)
                    val responseJson = result.data.getString("androidx.credentials.BUNDLE_KEY_REGISTRATION_RESPONSE_JSON") ?: ""
                    
                    val verified = apiClient.verifyPasskeyRegistration(responseJson, dynamicChallenge)
                    apiClient.close()
                    
                    if (!verified) {
                        throw Exception("Passkey verification failed on backend")
                    }
                    
                    Pair("extracted_cred_id_from_response", responseJson)
                } catch (e: CreateCredentialException) {
                    apiClient.close()
                    throw Exception("Failed to create passkey: ${e.message}", e)
                } catch (e: Exception) {
                    apiClient.close()
                    throw Exception("Unknown error creating passkey", e)
                }
            }
        }
    }
}
