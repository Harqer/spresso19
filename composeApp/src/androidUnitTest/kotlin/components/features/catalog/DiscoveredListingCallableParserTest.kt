package components.features.catalog

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class DiscoveredListingCallableParserTest {
    @Test
    fun parsesCanonicalListingsInsideFirebaseCallableResultEnvelope() {
        val listings =
            parseDiscoveredListingsCallableResponse(
                """
                {
                  "result": {
                    "listings": [
                      {
                        "id": "parallel-5f6c9a01",
                        "name": "Travel Mug",
                        "merchantUrl": "https://merchant.example/products/travel-mug",
                        "source": "parallel",
                        "observedPrice": {
                          "amount": 28.5,
                          "currency": "USD",
                          "evidenceUrl": "https://merchant.example/products/travel-mug"
                        },
                        "discoveredAt": "2026-08-30T12:00:00Z"
                      }
                    ]
                  }
                }
                """.trimIndent(),
            )

        assertEquals(1, listings.size)
        assertEquals("parallel-5f6c9a01", listings.single().id)
        assertEquals(28.5, listings.single().observedPrice?.amount)
    }

    @Test
    fun rejectsLegacyCallableItemsThatDoNotMeetTheListingContract() {
        assertFailsWith<IllegalArgumentException> {
            parseDiscoveredListingsCallableResponse(
                """
                {
                  "result": {
                    "items": [
                      {
                        "id": "legacy-1",
                        "name": "Travel Mug",
                        "merchantUrl": "https://merchant.example/products/travel-mug",
                        "source": "parallel",
                        "price": 28.5
                      }
                    ]
                  }
                }
                """.trimIndent(),
            )
        }
    }
}
