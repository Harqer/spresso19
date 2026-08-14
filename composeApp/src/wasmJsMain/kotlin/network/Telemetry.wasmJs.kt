package network

actual fun logCrashlyticsBreadcrumb(action: String, data: String) {
    // No-op for web
    println("Telemetry: $action - $data")
}
