package components.features.wearables

import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
class WearableToolProtocolTest {
    @Test
    fun parsesCallIdNameAndArguments() {
        val calls =
            WearableToolCallParser.parse(
                """
                {
                  "toolCall": {
                    "functionCalls": [
                      {
                        "id": "call-123",
                        "name": "addToCart",
                        "args": {"productId": "sku-42"}
                      }
                    ]
                  }
                }
                """.trimIndent(),
            )

        assertEquals(1, calls.size)
        assertEquals("call-123", calls.single().id)
        assertEquals("addToCart", calls.single().name)
        assertEquals("sku-42", calls.single().arguments["productId"])
    }

    @Test
    fun missingCallIdUsesStableCorrelationId() {
        val message =
            """
            {
              "toolCall": {
                "functionCalls": [
                  {"name": "startHandsFreeCheckout", "args": {}}
                ]
              }
            }
            """.trimIndent()

        val first = WearableToolCallParser.parse(message).single().id
        val second = WearableToolCallParser.parse(message).single().id

        assertTrue(first.isNotBlank())
        assertEquals(first, second)
    }

    @Test
    fun ignoresEntriesWithoutAFunctionName() {
        val calls =
            WearableToolCallParser.parse(
                """{"toolCall":{"functionCalls":[{"id":"missing-name","args":{}}]}}""",
            )

        assertTrue(calls.isEmpty())
    }

    @Test
    fun ledgerRejectsDuplicateWithinRetentionWindow() {
        val ledger = ToolCallLedger(retentionMillis = 1_000L)

        assertTrue(ledger.claim("call-1", nowMillis = 100L))
        assertFalse(ledger.claim("call-1", nowMillis = 500L))
        assertTrue(ledger.contains("call-1"))
    }

    @Test
    fun ledgerAllowsCallAfterRetentionWindow() {
        val ledger = ToolCallLedger(retentionMillis = 1_000L)

        assertTrue(ledger.claim("call-1", nowMillis = 100L))
        assertTrue(ledger.claim("call-1", nowMillis = 1_100L))
    }

    @Test
    fun ledgerBoundsStoredCallIds() {
        val ledger = ToolCallLedger(maximumEntries = 2)

        assertTrue(ledger.claim("call-1", nowMillis = 1L))
        assertTrue(ledger.claim("call-2", nowMillis = 2L))
        assertTrue(ledger.claim("call-3", nowMillis = 3L))

        assertFalse(ledger.contains("call-1"))
        assertTrue(ledger.contains("call-2"))
        assertTrue(ledger.contains("call-3"))
    }
}
