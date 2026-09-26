package viewmodels

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

class LiveTurnPersistenceTest {
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun orderedQueueRunsEachTurnInEnqueueOrder() = runTest {
        val queue = OrderedTaskQueue(this)
        val firstSaveStarted = CompletableDeferred<Unit>()
        val finishFirstSave = CompletableDeferred<Unit>()
        val completed = mutableListOf<Int>()

        queue.enqueue(
            task = {
                firstSaveStarted.complete(Unit)
                finishFirstSave.await()
                completed += 1
                true
            },
        )
        queue.enqueue(
            task = {
                completed += 2
                true
            },
        )

        runCurrent()
        firstSaveStarted.await()
        assertEquals(emptyList(), completed)
        finishFirstSave.complete(Unit)
        runCurrent()

        assertEquals(listOf(1, 2), completed)
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun retryKeepsLaterTurnBehindEarlierTurnUntilSuccess() = runTest {
        val queue = OrderedTaskQueue(this)
        val completed = mutableListOf<String>()
        var attempts = 0

        var exhaustedRetriesReported = false
        queue.enqueue(
            task = {
                persistLiveTurnWithRetry(
                    save = {
                        attempts += 1
                        if (attempts == 1) error("temporary failure")
                        completed += "first"
                    },
                    onFailure = { exhaustedRetriesReported = true },
                    waitBeforeRetry = { },
                )
            },
        )
        queue.enqueue(
            task = {
                completed += "second"
                true
            },
        )
        runCurrent()

        assertEquals(2, attempts)
        assertEquals(false, exhaustedRetriesReported)
        assertEquals(listOf("first", "second"), completed)
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun aTurnThatExhaustsRetriesPreventsLaterTurnsFromCreatingHistoryGaps() = runTest {
        val queue = OrderedTaskQueue(this)
        val completed = mutableListOf<String>()
        var attempts = 0
        var exhaustedRetriesReported = false
        var blockedTurnReported = 0

        queue.enqueue(
            task = {
                persistLiveTurnWithRetry(
                    save = {
                        attempts += 1
                        error("permanent failure")
                    },
                    onFailure = { exhaustedRetriesReported = true },
                    waitBeforeRetry = { },
                )
            },
        )
        queue.enqueue(
            task = {
                completed += "must-not-save"
                true
            },
            onBlocked = { blockedTurnReported += 1 },
        )
        runCurrent()

        assertEquals(3, attempts)
        assertEquals(true, exhaustedRetriesReported)
        assertEquals(emptyList(), completed)
        assertEquals(1, blockedTurnReported)
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun failureBlocksLaterSavesAndReportsBothTheFailedAndBlockedTurns() = runTest {
        val queue = OrderedTaskQueue(this)
        val events = mutableListOf<String>()

        queue.enqueue(
            task = {
                events += "failed-turn"
                false
            },
            onFailure = { events += "save-error" },
        )
        queue.enqueue(
            task = {
                events += "must-not-run"
                true
            },
            onBlocked = { events += "blocked-error" },
        )
        runCurrent()

        assertEquals(listOf("failed-turn", "save-error", "blocked-error"), events)
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun cancellingQueueWorkerDoesNotLeakIntoTheNextTurnAsAnUncompletedWait() = runTest {
        val queue = OrderedTaskQueue(this)
        val events = mutableListOf<String>()

        queue.enqueue(
            task = {
                events += "cancelled-turn"
                throw kotlinx.coroutines.CancellationException("cancel persistence")
            },
            onFailure = { events += "save-error" },
        )
        queue.enqueue(
            task = {
                events += "later-turn"
                true
            },
            onBlocked = { events += "blocked-error" },
        )
        runCurrent()

        assertEquals(listOf("cancelled-turn", "save-error", "blocked-error"), events)
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun cancellationIsRethrownFromRetryLoop() = runTest {
        var attempts = 0
        var cancellationObserved = false
        try {
            persistLiveTurnWithRetry(
                save = {
                    attempts += 1
                    throw kotlinx.coroutines.CancellationException("cancel persistence")
                },
                onFailure = { error("cancellation must not be reported as a save failure") },
                waitBeforeRetry = { },
            )
        } catch (cancelled: kotlinx.coroutines.CancellationException) {
            cancellationObserved = true
        }

        assertEquals(1, attempts)
        assertEquals(true, cancellationObserved)
    }
}
