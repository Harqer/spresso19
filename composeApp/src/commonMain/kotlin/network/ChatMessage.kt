package network

import kotlinx.serialization.Serializable
import network.models.GroundingSource

@Serializable
data class ChatMessage(
    val id: String = "1",
    val text: String,
    val isUser: Boolean,
    val timestamp: String = "Just now",
    val isStreaming: Boolean = false,
    val thought: String? = null,
    val sources: List<GroundingSource> = emptyList(),
    val products: List<ProductItem> = emptyList(),
    val mediaUrl: String? = null,
    val mediaType: String? = null,
    val widget: String? = null
)
