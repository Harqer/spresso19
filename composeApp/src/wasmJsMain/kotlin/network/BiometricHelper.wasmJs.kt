@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

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

actual suspend fun getCheckoutDevicePublicKey(): String? =
    suspendCancellableCoroutine { continuation ->
        ensureWebCheckoutDeviceKey(
            onSuccess = { publicKeyBase64 -> continuation.resume(publicKeyBase64) },
            onError = { continuation.resume(null) },
        )
    }

/**
 * Web checkout signing key: an EC P-256 pair in WebCrypto. The public key is
 * exported in the raw uncompressed form the backend stores; the private key
 * is a non-extractable CryptoKey persisted in IndexedDB and only usable after
 * WebAuthn user verification. Returns base64 raw point (65 bytes).
 */
@JsFun(
    """
function(onSuccess, onError) {
    async function main() {
        if (!window.crypto || !crypto.subtle || !window.indexedDB) {
            onError("WebCrypto not supported");
            return;
        }
        const existing = await new Promise(function(resolve, reject) {
            const open = indexedDB.open("spresso-checkout-keys", 1);
            open.onupgradeneeded = function() { open.result.createObjectStore("keys"); };
            open.onsuccess = function() { resolve(open.result); };
            open.onerror = function() { reject(open.error); };
        });
        const stored = await new Promise(function(resolve, reject) {
            const tx = existing.transaction("keys", "readonly");
            const req = tx.objectStore("keys").get("deviceKey");
            req.onsuccess = function() { resolve(req.result || null); };
            req.onerror = function() { reject(req.error); };
        });
        let keyPair = stored;
        if (!keyPair) {
            keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
            await new Promise(function(resolve, reject) {
                const tx = existing.transaction("keys", "readwrite");
                tx.objectStore("keys").put(keyPair, "deviceKey");
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function() { reject(tx.error); };
            });
        }
        const raw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
        let binary = "";
        const bytes = new Uint8Array(raw);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        onSuccess(btoa(binary));
    }
    main().catch(function(err) { onError(err && err.message ? err.message : String(err)); });
}
""",
)
private external fun ensureWebCheckoutDeviceKey(
    onSuccess: (String) -> Unit,
    onError: (String?) -> Unit,
)

/**
 * Signs the exact-intent message with the persisted WebCrypto checkout key
 * after WebAuthn user verification, returning the assertion bundle the
 * Android path produces: base64 JSON `{ payload, signature, publicKey }`.
 * The signature is raw r||s (64 bytes) over SHA-256 of the message.
 */
@JsFun(
    """
function(reason, payload, onSuccess, onError) {
    async function main() {
        if (!window.PublicKeyCredential || !navigator.credentials || !window.crypto || !crypto.subtle || !window.indexedDB) {
            onError("WebAuthn or WebCrypto not supported");
            return;
        }
        const open = await new Promise(function(resolve, reject) {
            const req = indexedDB.open("spresso-checkout-keys", 1);
            req.onupgradeneeded = function() { req.result.createObjectStore("keys"); };
            req.onsuccess = function() { resolve(req.result); };
            req.onerror = function() { reject(req.error); };
        });
        const keyPair = await new Promise(function(resolve, reject) {
            const tx = open.transaction("keys", "readonly");
            const get = tx.objectStore("keys").get("deviceKey");
            get.onsuccess = function() { resolve(get.result || null); };
            get.onerror = function() { reject(get.error); };
        });
        if (!keyPair) {
            onError("This device is not registered for purchase confirmation.");
            return;
        }
        // WebAuthn gate: user verification happens here, then the persisted
        // non-extractable key signs the exact-intent message.
        const challenge = new TextEncoder().encode(payload);
        await navigator.credentials.get({
            publicKey: { challenge: challenge, timeout: 60000, userVerification: "required" }
        });
        // Signs the message bytes directly — WebCrypto hashes internally with
        // SHA-256 (one hash), matching Android's SHA256withECDSA and the
        // server's crypto.verify("sha256", message).
        const messageBytes = new TextEncoder().encode(payload);
        const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, messageBytes);
        const sigBytes = new Uint8Array(signature);
        let sigBinary = "";
        for (let i = 0; i < sigBytes.length; i++) sigBinary += String.fromCharCode(sigBytes[i]);
        const raw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
        const pubBytes = new Uint8Array(raw);
        let pubBinary = "";
        for (let i = 0; i < pubBytes.length; i++) pubBinary += String.fromCharCode(pubBytes[i]);
        const bundle = JSON.stringify({
            payload: payload,
            signature: btoa(sigBinary),
            publicKey: btoa(pubBinary)
        });
        onSuccess(btoa(bundle));
    }
    main().catch(function(err) { onError(err && err.message ? err.message : String(err)); });
}
""",
)
private external fun triggerWebAuthnSignature(
    reason: String,
    payload: String,
    onSuccess: (String) -> Unit,
    onError: (String?) -> Unit,
)
