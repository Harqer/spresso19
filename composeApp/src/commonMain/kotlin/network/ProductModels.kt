package network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** A merchant listing normalized for the client. Convex owns discovery; this is transport-only. */
@Serializable
data class ProductItem(
    val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val price: Double?,
    val imageUrl: String,
    val rating: Double? = null,
    val description: String? = null,
    val merchantUrl: String? = null,
    val source: String? = null,
    val providerListingId: String? = null,
)

@Serializable
data class GeneratedOutfit(
    val title: String? = null,
    @SerialName("stylingAdvice") val stylingAdvice: String? = null,
    @SerialName("selectedItemIds") val selectedItemIds: List<String> = emptyList(),
    @SerialName("weatherMatchScore") val weatherMatchScore: Double? = null,
    @SerialName("styleTips") val styleTips: List<String> = emptyList(),
)

@Serializable
data class LensSearchResponse(
    val success: Boolean,
    val listings: List<components.features.catalog.DiscoveredListing> = emptyList(),
)

@Serializable
data class DetectedItem(
    val detectedName: String,
    val brandGuess: String,
    val category: String,
    val priceEstimate: Double,
    val confidenceScore: Double,
    val buyActionPrompt: String? = null,
    val boundingBox: List<Double>? = null,
    val matchingCatalogId: String? = null,
)
