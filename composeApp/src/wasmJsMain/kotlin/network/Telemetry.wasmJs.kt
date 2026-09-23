@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package network

@JsFun("(action, data) => console.error('[Spresso]', action, data)")
private external fun reportBrowserError(
    action: String,
    data: String,
)

actual fun logCrashlyticsBreadcrumb(
    action: String,
    data: String,
) {
    reportBrowserError(action, data)
}
