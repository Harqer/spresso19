package navigation

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlin.test.Test
import kotlin.test.assertEquals

class NavKeySerializationTest {
    private val json = Json { encodeDefaults = true }

    @Test
    fun productDestinationRoundTripsWithItsIdentifier() {
        val original = NavKey.ProductDetailKey("listing-42")
        val encoded = json.encodeToJsonElement(NavKey.serializer(), original)

        assertEquals(original, json.decodeFromJsonElement(NavKey.serializer(), encoded))
    }

    @Test
    fun chatDestinationRoundTripsOptionalArguments() {
        val original = NavKey.ChatKey(initialPrompt = "Find a linen shirt", initialImage = "image-key")
        val encoded = json.encodeToJsonElement(NavKey.serializer(), original)

        assertEquals(original, json.decodeFromJsonElement(NavKey.serializer(), encoded))
    }
}
