package network.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import network.ProductItem

@Serializable
data class GroundingSource(
    val title: String,
    val uri: String
)

@Serializable
data class ToolCallResult(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null,
    val spinVideoUrl: String? = null,
    val tryOnMeta: TryOnResult? = null,
    val genMediaKit: GenMediaResult? = null
)

@Serializable
data class TryOnResult(
    val success: Boolean,
    val mediaType: String,
    val renderedImageUrl: String? = null
)

@Serializable
data class GenMediaResult(
    val success: Boolean,
    val genMediaKit: GenMediaKitDetails? = null
)

@Serializable
data class GenMediaKitDetails(
    val materials: List<String> = emptyList(),
    val sustainabilityScore: String? = null,
    val videoUrl: String? = null
)

@Serializable
data class ChatStreamChunk(
    val type: String,
    val text: String? = null,
    val queries: List<String>? = null,
    val sources: List<GroundingSource>? = null,
    val products: List<ProductItem>? = null,
    @SerialName("recommended_products")
    val recommendedProducts: List<ProductItem>? = null,
    val name: String? = null,
    val args: Map<String, String>? = null,
    val result: ToolCallResult? = null
)
