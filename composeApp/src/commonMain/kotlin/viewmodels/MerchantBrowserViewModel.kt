package viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import network.ConvexApi
import network.MerchantBrowserEvent
import network.MerchantBrowserSession

/**
 * Owner-side state for the merchant browser automation session. Polls the
 * canonical Convex transport on a bounded interval (the KMP client has no
 * realtime subscription for these actions) and exposes typed state only —
 * provider payloads never reach composables.
 *
 * HITL takeover: TAKE_OVER returns a short-lived Live View URL for the SAME
 * provider browser session; it is held in [liveViewUrl] purely for display,
 * never persisted, and expires by provider policy (the card re-fetches it
 * through [refreshLiveView] while the user holds control).
 */
class MerchantBrowserViewModel(
    private val apiClient: ConvexApi,
    private val scope: CoroutineScope,
) {
    var session by mutableStateOf<MerchantBrowserSession?>(null)
        private set
    val events = mutableStateListOf<MerchantBrowserEvent>()
    var controlError by mutableStateOf<String?>(null)
        private set
    var liveViewUrl by mutableStateOf<String?>(null)
        private set
    var liveViewError by mutableStateOf<String?>(null)
        private set

    private var pollJob: Job? = null
    private var lastSeq = 0L
    private var lastSessionId: String? = null

    /** Start (or restart) bounded polling; safe to call repeatedly. */
    fun start() {
        if (pollJob?.isActive == true) return
        pollJob =
            scope.launch {
                while (true) {
                    try {
                        val active = apiClient.fetchMerchantSession()
                        session = active
                        if (active != null) {
                            // A different session id means the previous one
                            // ended; its sequence counter is not comparable
                            // with the new session's — restart tracking so
                            // the new session's events are never skipped.
                            if (active.sessionId != lastSessionId) {
                                events.clear()
                                lastSeq = 0L
                                lastSessionId = active.sessionId
                            }
                            if (active.lastEventSeq > lastSeq) {
                                val fresh = apiClient.fetchMerchantSessionEvents(active.sessionId, lastSeq)
                                if (fresh.isNotEmpty()) {
                                    events.addAll(fresh)
                                    lastSeq = fresh.last().sequence
                                }
                            }
                        }
                        if (active == null) reset()
                    } catch (_: Exception) {
                        // Transient transport failures keep the last good state.
                    }
                    delay(3_000)
                }
            }
    }

    fun stop() {
        pollJob?.cancel()
        pollJob = null
        reset()
    }

    fun pause() = control("PAUSE")

    fun resume() = control("RESUME")

    fun takeOver() = control("TAKE_OVER")

    /** Re-fetch the short-lived Live View while the user holds control. */
    fun refreshLiveView() {
        val current = session ?: return
        if (current.status != "HUMAN_CONTROL") return
        scope.launch {
            try {
                liveViewError = null
                liveViewUrl = apiClient.fetchMerchantLiveView(current.sessionId)
            } catch (error: Exception) {
                liveViewError = error.message ?: "Could not open the live browser view."
            }
        }
    }

    fun dismissLiveView() {
        liveViewUrl = null
    }

    private fun control(control: String) {
        val current = session ?: return
        scope.launch {
            try {
                controlError = null
                val result = apiClient.controlMerchantSession(current.sessionId, control)
                if (control == "TAKE_OVER" && result.ok) {
                    liveViewUrl = result.liveViewUrl
                }
            } catch (error: Exception) {
                controlError = error.message ?: "Could not update the automation."
            }
        }
    }

    private fun reset() {
        events.clear()
        lastSeq = 0L
        lastSessionId = null
        liveViewUrl = null
    }
}
