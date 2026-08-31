package components.features.catalog

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject

@Serializable
data class ObservedPrice(
    val amount: Double,
    val currency: String,
    val evidenceUrl: String,
)

@Serializable
data class DiscoveredListing(
    val id: String,
    val name: String,
    val brand: String? = null,
    val category: String? = null,
    val imageUrl: String? = null,
    val merchantUrl: String,
    val source: String,
    val providerListingId: String? = null,
    val observedPrice: ObservedPrice? = null,
    val discoveredAt: String,
    val expiresAt: String? = null,
    val confidence: Double? = null,
)

private val callableListingJson = Json { ignoreUnknownKeys = false }

fun parseDiscoveredListingsCallableResponse(responseJson: String): List<DiscoveredListing> {
    val root = callableListingJson.parseToJsonElement(responseJson).jsonObject
    val result = root["result"]?.jsonObject ?: root
    val listings = result["listings"]?.jsonArray
        ?: throw IllegalArgumentException("Discovery response does not contain canonical listings.")

    return listings.map { listingElement ->
        val listing = callableListingJson.decodeFromString<DiscoveredListing>(listingElement.toString())
        require(listing.merchantUrl.startsWith("https://")) { "Merchant URL must use HTTPS." }
        require(listing.source in setOf("parallel", "serpapi", "apify", "kitesurf")) { "Listing source is not supported." }
        listing.observedPrice?.let { price ->
            require(price.amount > 0) { "Observed price must be positive." }
            require(price.currency.matches(Regex("[A-Z]{3}"))) { "Observed price currency must be ISO 4217." }
            require(price.evidenceUrl.startsWith("https://")) { "Price evidence URL must use HTTPS." }
        }
        listing
    }
}

fun stableListingId(source: String, merchantUrl: String, providerListingId: String? = null): String {
    val input = "$source:${merchantUrl.substringBefore('#')}:${providerListingId.orEmpty()}"
    var hash = 2166136261u
    input.forEach { character ->
        hash = (hash xor character.code.toUInt()) * 16777619u
    }
    return "$source-${hash.toString(16).padStart(8, '0')}"
}
