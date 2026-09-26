package network

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LiveTranscriptAccumulatorTest {
    @Test
    fun lateFinalInputCanUpdateCompletedTurnBeforeNextTurnBegins() {
        val accumulator = LiveTranscriptAccumulator()
        accumulator.appendOutput("Here are the results")
        val completed = accumulator.completeTurn()

        assertEquals("", completed?.userTranscript)
        assertEquals("Here are the results", completed?.assistantTranscript)
        assertEquals("find a jacket", accumulator.appendInput("find a jacket"))
        assertNull(accumulator.completeTurn())

        accumulator.reset()
        accumulator.setInterimInput("find waterproof")
        accumulator.appendInput("find waterproof")
        accumulator.appendOutput("Here are waterproof options")
        val nextTurn = accumulator.completeTurn()
        assertEquals("find waterproof", nextTurn?.userTranscript)
        assertEquals("Here are waterproof options", nextTurn?.assistantTranscript)
    }

    @Test
    fun newInterimInputDoesNotDiscardThePreviousCompletedUserTranscript() {
        val accumulator = LiveTranscriptAccumulator()
        accumulator.appendInput("find red shoes")
        accumulator.appendOutput("Here are some")
        val firstTurn = accumulator.completeTurn()
        assertEquals("find red shoes", firstTurn?.userTranscript)

        accumulator.setInterimInput("show me black")
        accumulator.appendInput("show me black shoes")
        accumulator.appendOutput("These are black")

        val nextTurn = accumulator.completeTurn()
        assertEquals("show me black shoes", nextTurn?.userTranscript)
    }

    @Test
    fun whitespaceOnlyLateTranscriptionDoesNotCompleteOrEraseThePendingTurn() {
        val accumulator = LiveTranscriptAccumulator()
        accumulator.appendOutput("Here is the result")
        accumulator.completeTurn()

        assertEquals("", accumulator.appendInput("   "))
        assertNull(accumulator.completeTurn())
        assertEquals("a red jacket", accumulator.appendInput("a red jacket"))
        assertNull(accumulator.completeTurn())
        assertEquals("Here is the result", accumulator.appendOutput("Here is the result"))
        val completed = accumulator.completeTurn()
        assertEquals("a red jacket", completed?.userTranscript)
        assertEquals("Here is the result", completed?.assistantTranscript)
    }

    @Test
    fun cumulativeFinalTranscriptionsCanBeExtendedWithoutAWordBoundarySpace() {
        assertEquals("Sunshine", mergeFinalizedTranscript("Sun", "Sunshine"))
        assertEquals("find red shoes", mergeFinalizedTranscript("find red", "find red shoes"))
    }
}
