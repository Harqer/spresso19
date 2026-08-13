package network.models

import kotlinx.serialization.Serializable

@Serializable
data class GroceryItem(
    val id: String,
    val name: String,
    val quantity: Int,
    val unit: String,
    val category: String,
    val estimatedPrice: Double,
    val checked: Boolean = false,
    val storeNote: String? = null
)
