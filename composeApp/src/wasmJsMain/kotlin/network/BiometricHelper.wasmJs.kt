package network

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

actual suspend fun promptBiometricAuth(
    reason: String,
    payload: String,
): String? =
    suspendCancellableCoroutine { continuation ->
        triggerWebAuthnSignature(
            reason = reason,
            payload = payload,
            onSuccess = { signature -> continuation.resume(signature) },
            onError = { continuation.resume(null) },
        )
    }

@JsFun(
    """
function(reason, payload, onSuccess, onError) {
    if (!window.PublicKeyCredential || !navigator.credentials) {
        onError("WebAuthn not supported");
        return;
    }

    var challenge = new Uint8Array(payload.length);
    for (var i = 0; i < payload.length; i++) {
        challenge[i] = payload.charCodeAt(i);
    }

    navigator.credentials.get({
        publicKey: {
            challenge: challenge,
            timeout: 60000,
            userVerification: "required"
        }
    }).then(function(assertion) {
        if (assertion && assertion.response && assertion.response.signature) {
            var sigBytes = new Uint8Array(assertion.response.signature);
            var binary = "";
            for (var i = 0; i < sigBytes.byteLength; i++) {
                binary += String.fromCharCode(sigBytes[i]);
            }
            onSuccess(btoa(binary));
        } else {
            onError("Invalid assertion");
        }
    }).catch(function(err) {
        onError(err.message || "Authentication failed");
    });
}
""",
)
private external fun triggerWebAuthnSignature(
    reason: String,
    payload: String,
    onSuccess: (String) -> Unit,
    onError: (String?) -> Unit,
)
