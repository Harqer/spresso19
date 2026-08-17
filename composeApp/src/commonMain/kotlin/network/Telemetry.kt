package network

expect fun logCrashlyticsBreadcrumb(action: String, data: String)

object Telemetry {
    fun recordError(message: String, e: Throwable) {
        logCrashlyticsBreadcrumb("ERROR", "$message: ${e.message}")
        println("ERROR: $message: ${e.message}")
    }
}
