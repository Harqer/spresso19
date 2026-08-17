package network

actual suspend fun callFirebaseFunction(functionName: String, dataJson: String): String {
    // For WasmJS, we would use Ktor or window.fetch to call the cloud function's HTTPS URL directly.
    // For now, this is a stub as Firebase SDKs aren't fully supported on this target.
    throw Exception("Firebase Cloud Functions are not fully supported on the WasmJS target yet.")
}
