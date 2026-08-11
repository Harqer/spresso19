package network

@JsFun("() => { if (typeof window === 'undefined') return ''; const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'; return proto + '//' + window.location.host + '/api/live-chef'; }")
private external fun getBackendWsUrl(): String

actual object SpressoConfig {
    actual val backendWebSocketUrl: String
        get() = getBackendWsUrl()
    actual val googlePayMerchantId: String
        get() = "BCR2DN6DTK6ZNGLF"
}
