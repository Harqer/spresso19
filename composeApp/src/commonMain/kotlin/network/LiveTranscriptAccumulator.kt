package network

internal data class FinalizedLiveTurn(
    val userTranscript: String,
    val assistantTranscript: String,
    val interrupted: Boolean,
)

/**
 * Collects finalized speech segments in provider order; interim values are UI-only.
 *
 * Gemini Live can deliver the final input transcription after turnComplete, so a
 * completed turn with assistant audio stays held instead of resetting immediately:
 *  - a blank or duplicate late input transcription is ignored;
 *  - an extension is merged into the committed user transcript and returned so the
 *    ViewModel can reconcile it server-side, without emitting the turn twice;
 *  - late assistant output re-arms completion so the updated turn is emitted once;
 *  - the next interim input (new user speech) resets the accumulator for a fresh turn.
 */
internal class LiveTranscriptAccumulator {
    private val userSegments = mutableListOf<String>()
    private val assistantSegments = mutableListOf<String>()
    private val assistantTextFallbackSegments = mutableListOf<String>()
    private var interimInput = ""
    private var interrupted = false
    private var assistantOutputSeen = false
    private var completedAwaitingInput = false
    private var outputSeenAfterCompletion = false

    fun setInterimInput(fragment: String): String {
        if (completedAwaitingInput) reset()
        interimInput = fragment
        return (userSegments + fragment).joinToString(" ").trim()
    }

    fun appendInput(fragment: String): String {
        val finalized = fragment.trim()
        if (completedAwaitingInput) {
            // Late final transcription for the held turn: merge it in for
            // reconciliation, but never re-emit the completed turn here.
            if (finalized.isEmpty()) return ""
            val merged = mergeFinalizedTranscript(userTranscript(), finalized)
            if (merged == userTranscript()) return ""
            replaceUserTranscript(merged)
            return merged
        }
        if (finalized.isNotEmpty()) replaceUserTranscript(mergeFinalizedTranscript(userTranscript(), finalized))
        interimInput = ""
        return userTranscript()
    }

    fun appendOutput(fragment: String): String {
        val finalized = fragment.trim()
        if (finalized.isNotEmpty()) {
            if (completedAwaitingInput) {
                // Late output transcription re-arms the held turn so the next
                // turnComplete emits the updated turn exactly once.
                replaceAssistantTranscript(mergeFinalizedTranscript(assistantTranscript(), finalized))
                outputSeenAfterCompletion = true
            } else {
                assistantSegments += finalized
                assistantOutputSeen = true
            }
        }
        return assistantTranscript()
    }

    fun appendModelText(fragment: String) {
        if (fragment.isNotBlank()) {
            if (completedAwaitingInput) {
                replaceAssistantTranscript(mergeFinalizedTranscript(assistantTranscript(), fragment.trim()))
                outputSeenAfterCompletion = true
            } else {
                assistantTextFallbackSegments += fragment
                assistantOutputSeen = true
            }
        }
    }

    fun markAssistantAudio() {
        assistantOutputSeen = true
    }

    /** An interruption cancels old assistant output but keeps user speech for the replacement answer. */
    fun interrupt() {
        if (completedAwaitingInput) reset()
        interimInput = ""
        assistantSegments.clear()
        assistantTextFallbackSegments.clear()
        assistantOutputSeen = false
        interrupted = true
    }

    fun completeTurn(): FinalizedLiveTurn? {
        if (completedAwaitingInput) {
            if (!outputSeenAfterCompletion) return null
            outputSeenAfterCompletion = false
            val reEmitted = FinalizedLiveTurn(
                userTranscript = userTranscript(),
                assistantTranscript = assistantTranscript().ifBlank { assistantTextFallback() },
                interrupted = interrupted,
            )
            assistantSegments.clear()
            assistantSegments += reEmitted.assistantTranscript
            assistantTextFallbackSegments.clear()
            return reEmitted.takeIf { it.userTranscript.isNotBlank() || it.assistantTranscript.isNotBlank() }
        }
        if (interrupted && !assistantOutputSeen) return null

        // The final input transcription may never arrive; the last interim
        // value is then the only record of the user's speech.
        if (userSegments.isEmpty() && interimInput.isNotBlank()) {
            replaceUserTranscript(interimInput.trim())
        }
        val completed = FinalizedLiveTurn(
            userTranscript = userTranscript(),
            assistantTranscript = assistantTranscript().ifBlank { assistantTextFallback() },
            interrupted = interrupted,
        )
        val hasTranscript = completed.userTranscript.isNotBlank() || completed.assistantTranscript.isNotBlank()
        if (completed.assistantTranscript.isNotBlank()) {
            // Input transcription can arrive after turnComplete; hold this
            // completed turn open for that late final segment.
            assistantSegments.clear()
            assistantSegments += completed.assistantTranscript
            assistantTextFallbackSegments.clear()
            interimInput = ""
            interrupted = completed.interrupted
            assistantOutputSeen = true
            completedAwaitingInput = true
            outputSeenAfterCompletion = false
        } else {
            reset()
        }
        return completed.takeIf { hasTranscript }
    }

    fun reset() {
        userSegments.clear()
        assistantSegments.clear()
        assistantTextFallbackSegments.clear()
        interimInput = ""
        interrupted = false
        assistantOutputSeen = false
        completedAwaitingInput = false
        outputSeenAfterCompletion = false
    }

    private fun replaceUserTranscript(value: String) {
        userSegments.clear()
        if (value.isNotEmpty()) userSegments += value
    }

    private fun replaceAssistantTranscript(value: String) {
        assistantSegments.clear()
        if (value.isNotEmpty()) assistantSegments += value
    }

    private fun userTranscript(): String = userSegments.joinToString(" ").trim()

    private fun assistantTranscript(): String = assistantSegments.joinToString(" ").trim()

    private fun assistantTextFallback(): String = assistantTextFallbackSegments.joinToString("").trim()
}

internal fun mergeFinalizedTranscript(existing: String, incoming: String): String {
    val previousWords = existing.trim().split(Regex("\\s+")).filter(String::isNotEmpty)
    val incomingWords = incoming.trim().split(Regex("\\s+")).filter(String::isNotEmpty)
    if (incomingWords.isEmpty()) return previousWords.joinToString(" ")
    if (previousWords.isEmpty()) return incomingWords.joinToString(" ")
    val previous = previousWords.joinToString(" ")
    val next = incomingWords.joinToString(" ")
    if (previous == next || previous.startsWith("$next ")) return previous
    if (next.startsWith("$previous ") || next.startsWith(previous)) return next

    val maxOverlap = minOf(previousWords.size, incomingWords.size)
    val overlap = (maxOverlap downTo 1).firstOrNull { count ->
        previousWords.takeLast(count).zip(incomingWords.take(count)).all { (left, right) -> left.equals(right, ignoreCase = true) }
    } ?: 0
    return (previousWords + incomingWords.drop(overlap)).joinToString(" ")
}
