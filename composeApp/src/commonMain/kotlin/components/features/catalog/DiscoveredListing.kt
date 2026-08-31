package components.features.catalog

data class ObservedPrice(
    val amount: Double,
    val currency: String,
    val evidenceUrl: String,
)

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

fun stableListingId(source: String, merchantUrl: String, providerListingId: String? = null): String {
    val input = "$source:${merchantUrl.substringBefore('#')}:${providerListingId.orEmpty()}"
    var hash = 2166136261u
    input.forEach { character ->
        hash = (hash xor character.code.toUInt()) * 16777619u
    }
    return "$source-${hash.toString(16).padStart(8, '0')}"
}
