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

    private var pollJob: Job? = null
    private var lastSeq = 0L

    /** Start (or restart) bounded polling; safe to call repeatedly. */
    fun start() {
        if (pollJob?.isActive == true) return
        pollJob =
            scope.launch {
                while (true) {
                    try {
                        val active = apiClient.fetchMerchantSession()
                        session = active
                        if (active != null && active.lastEventSeq > lastSeq) {
                            val fresh = apiClient.fetchMerchantSessionEvents(active.sessionId, lastSeq)
                            if (fresh.isNotEmpty()) {
                                events.addAll(fresh)
                                lastSeq = fresh.last().sequence
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

    private fun control(control: String) {
        val current = session ?: return
        scope.launch {
            try {
                controlError = null
                apiClient.controlMerchantSession(current.sessionId, control)
            } catch (error: Exception) {
                controlError = error.message ?: "Could not update the automation."
            }
        }
    }

    private fun reset() {
        events.clear()
        lastSeq = 0L
    }
}
