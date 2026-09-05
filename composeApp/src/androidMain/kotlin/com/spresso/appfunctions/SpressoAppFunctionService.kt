package com.spresso.appfunctions

import androidx.annotation.RequiresApi
import androidx.appfunctions.AppFunction
import androidx.appfunctions.AppFunctionInvalidArgumentException
import androidx.appfunctions.AppFunctionSerializable
import androidx.appfunctions.AppFunctionService
import androidx.appfunctions.AppFunctionServiceEntryPoint
import com.spresso.dataconnect.SpressoConnectorConnector
import com.spresso.dataconnect.execute
import com.spresso.dataconnect.instance
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import network.callFirebaseFunction
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** The parameter to order a coffee. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class OrderCoffeeParams(
    /** The type of coffee, e.g. Latte, Espresso, Cappuccino. */
    val coffeeType: String,
    /** The size of the coffee, must be Small, Medium, or Large. */
    val size: String,
    /** Any additional instructions. */
    val instructions: String? = null,
)

/** The result of a coffee order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class CoffeeOrderResult(
    /** The catalog ID added to the cart. */
    val cartItemId: String,
    /** A message explaining the required checkout step. */
    val confirmationMessage: String,
    /** Purchases always require the user to review and confirm checkout. */
    val requiresCheckoutConfirmation: Boolean,
)

/** The parameter to save a wardrobe item. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class SaveWardrobeItemParams(
    /** The name of the item. */
    val itemName: String,
    /** The category, e.g. Top, Bottom, Shoes. */
    val category: String,
    /** The color of the item. */
    val color: String? = null,
    /** A secure image URL for the wardrobe item. */
    val imageUrl: String,
)

/** The result of saving a wardrobe item. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class SaveWardrobeItemResult(
    /** The ID of the saved item. */
    val itemId: String,
    /** A confirmation message. */
    val confirmationMessage: String,
)

/** The parameter to view an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class ViewOrderParams(
    /** The ID of the order to view. */
    val orderId: String,
)

/** The result of viewing an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class ViewOrderResult(
    /** The ID of the order. */
    val orderId: String,
    /** The status of the order. */
    val status: String,
    /** The details of the items in the order. */
    val itemsDescription: String,
)

/** The parameter to check the status of an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class CheckOrderStatusParams(
    /** The ID of the order to check. */
    val orderId: String,
)

/** The result of checking the status of an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class CheckOrderStatusResult(
    /** The current status of the order. */
    val status: String,
    /** The carrier-provided estimated delivery time, when available. */
    val estimatedDeliveryTime: String?,
)

/** The parameter to acknowledge the delivery of an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class AcknowledgeDeliveryParams(
    /** The ID of the delivered order. */
    val orderId: String,
    /** Optional feedback for the delivery. */
    val feedback: String? = null,
)

/** The result of acknowledging a delivery. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class AcknowledgeDeliveryResult(
    /** A confirmation message. */
    val confirmationMessage: String,
)

/** The parameter to add an item to the cart. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class AddToCartParams(
    /** The ID of the item to add. */
    val itemId: String,
    /** The quantity of the item to add. */
    val quantity: Int,
)

/** The result of adding an item to the cart. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class AddToCartResult(
    /** A confirmation message. */
    val confirmationMessage: String,
    /** The total number of items in the cart. */
    val totalItems: Int,
)

/** The parameter to search for products. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class SearchProductsParams(
    /** The search query string for products or groceries. */
    val query: String,
)

/** The result of a product search. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class SearchProductsResult(
    /** A description of the search results found. */
    val resultsDescription: String,
)

@RequiresApi(36)
@AppFunctionServiceEntryPoint(
    serviceName = "SpressoAppFunctionService",
    appFunctionXmlFileName = "spresso_app_function_service",
)
abstract class BaseSpressoAppFunctionService : AppFunctionService() {
    private suspend fun requireOrder(orderId: String): JSONObject {
        val response = JSONObject(callFirebaseFunction("getUserOrders", "{}"))
        val orders = response.optJSONArray("orders") ?: JSONArray()
        for (index in 0 until orders.length()) {
            val order = orders.optJSONObject(index) ?: continue
            if (order.optString("id") == orderId) return order
        }
        throw AppFunctionInvalidArgumentException("Order not found")
    }

    private fun describeOrderItems(order: JSONObject): String {
        val items = order.optJSONArray("items") ?: return "No item details are available"
        val descriptions =
            buildList {
                for (index in 0 until items.length()) {
                    val item = items.optJSONObject(index) ?: continue
                    val productName = item.optJSONObject("product")?.optString("name").orEmpty()
                    if (productName.isNotBlank()) add("$productName × ${item.optInt("quantity", 1)}")
                }
            }
        return descriptions.joinToString().ifBlank { "No item details are available" }
    }

    /**
     * Prepare a coffee order in the cart.
     * Required workflow: Call this to find a real catalog item and add it to the cart. The user must still review and confirm checkout.
     * @param params The parameter to describe how to order the coffee.
     * @return The result of the coffee order.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun orderCoffee(params: OrderCoffeeParams): CoffeeOrderResult =
        withContext(Dispatchers.IO) {
            if (params.size !in listOf("Small", "Medium", "Large")) {
                throw AppFunctionInvalidArgumentException("Size must be Small, Medium, or Large")
            }

            val query = "${params.size} ${params.coffeeType}".lowercase()
            val products = SpressoConnectorConnector.instance.listProducts.execute().data.products
            val product =
                products.firstOrNull {
                    val searchable = "${it.name} ${it.brand} ${it.category} ${it.description.orEmpty()}".lowercase()
                    params.coffeeType.lowercase() in searchable || query in searchable
                } ?: throw AppFunctionInvalidArgumentException("No matching coffee is currently available in the catalog")
            val result =
                JSONObject(
                    callFirebaseFunction(
                        "addToCart",
                        JSONObject()
                            .put("productId", product.id)
                            .put("quantity", 1)
                            .put("idempotencyKey", UUID.randomUUID().toString())
                            .toString(),
                    ),
                )
            if (!result.optBoolean("success")) {
                throw IllegalStateException("The item could not be added to the cart")
            }

            CoffeeOrderResult(
                cartItemId = product.id,
                confirmationMessage = "${product.name} is in your cart. Review the details and confirm checkout when you’re ready.",
                requiresCheckoutConfirmation = true,
            )
        }

    /**
     * Save an item to the wardrobe.
     * Required workflow: Call this to add a new clothing item to the user's wardrobe.
     * @param params The parameter to describe the wardrobe item.
     * @return The result of the save operation.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun saveWardrobeItem(params: SaveWardrobeItemParams): SaveWardrobeItemResult =
        withContext(Dispatchers.IO) {
            if (params.itemName.isBlank()) {
                throw AppFunctionInvalidArgumentException("Item name must not be empty")
            }
            if (!params.imageUrl.startsWith("https://")) {
                throw AppFunctionInvalidArgumentException("A secure wardrobe image URL is required")
            }

            val mutation =
                SpressoConnectorConnector.instance.addWardrobeItem.execute(
                    category = params.category,
                    imageUrl = params.imageUrl,
                ) {
                    brand = params.itemName
                    color = params.color
                }
            SaveWardrobeItemResult(
                itemId = mutation.data.wardrobeItem_insert.id.toString(),
                confirmationMessage = "Saved ${params.itemName} to your ${params.category.lowercase()} items.",
            )
        }

    /**
     * View the details of an existing order.
     * Required workflow: Call this to retrieve details for an order using its ID.
     * @param params The parameter specifying the order ID.
     * @return The details of the requested order.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun viewOrder(params: ViewOrderParams): ViewOrderResult =
        withContext(Dispatchers.IO) {
            if (params.orderId.isBlank()) {
                throw AppFunctionInvalidArgumentException("Order ID must not be empty")
            }

            val order = requireOrder(params.orderId)
            ViewOrderResult(
                orderId = params.orderId,
                status = order.optString("status", "Status unavailable").replace('_', ' ').lowercase(),
                itemsDescription = describeOrderItems(order),
            )
        }

    /**
     * Check the status of an order.
     * Required workflow: Call this to retrieve the latest status of an existing order.
     * @param params The parameter specifying the order ID.
     * @return The status of the requested order.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun checkOrderStatus(params: CheckOrderStatusParams): CheckOrderStatusResult =
        withContext(Dispatchers.IO) {
            if (params.orderId.isBlank()) {
                throw AppFunctionInvalidArgumentException("Order ID must not be empty")
            }

            val order = requireOrder(params.orderId)
            CheckOrderStatusResult(
                status = order.optString("trackingStatus").ifBlank { order.optString("status", "Status unavailable") },
                estimatedDeliveryTime = order.optString("estimatedDelivery").ifBlank { null },
            )
        }

    /**
     * Acknowledge the delivery of an order.
     * Required workflow: Call this to confirm that an order has been received by the customer.
     * @param params The parameter specifying the delivered order ID and optional feedback.
     * @return The result of the acknowledgement.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun acknowledgeDelivery(params: AcknowledgeDeliveryParams): AcknowledgeDeliveryResult =
        withContext(Dispatchers.IO) {
            if (params.orderId.isBlank()) {
                throw AppFunctionInvalidArgumentException("Order ID must not be empty")
            }

            requireOrder(params.orderId)
            val result =
                JSONObject(
                    callFirebaseFunction(
                        "acknowledgeDelivery",
                        JSONObject()
                            .put("orderId", params.orderId)
                            .put("feedback", params.feedback)
                            .put("idempotencyKey", UUID.randomUUID().toString())
                            .toString(),
                    ),
                )
            if (!result.optBoolean("success")) throw IllegalStateException("Delivery acknowledgement failed")
            AcknowledgeDeliveryResult(confirmationMessage = "Thanks — delivery for ${params.orderId} is confirmed.")
        }

    /**
     * Add an item to the shopping cart.
     * Required workflow: Call this to add a product to the user's cart before checkout.
     * @param params The parameter specifying the item ID and quantity.
     * @return The result of adding the item to the cart.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun addToCart(params: AddToCartParams): AddToCartResult =
        withContext(Dispatchers.IO) {
            if (params.itemId.isBlank()) {
                throw AppFunctionInvalidArgumentException("Item ID must not be empty")
            }
            if (params.quantity <= 0) {
                throw AppFunctionInvalidArgumentException("Quantity must be greater than zero")
            }

            val result =
                JSONObject(
                    callFirebaseFunction(
                        "addToCart",
                        JSONObject()
                            .put("productId", params.itemId)
                            .put("quantity", params.quantity)
                            .put("idempotencyKey", UUID.randomUUID().toString())
                            .toString(),
                    ),
                )
            if (!result.optBoolean("success")) throw IllegalStateException("The cart could not be updated")
            AddToCartResult(
                confirmationMessage = "Added ${params.quantity} to your cart.",
                totalItems = result.getInt("totalItems"),
            )
        }

    /**
     * Search for products or groceries.
     * Required workflow: Call this to find products matching a specific query.
     * @param params The parameter specifying the search query.
     * @return The results of the product search.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun searchProducts(params: SearchProductsParams): SearchProductsResult =
        withContext(Dispatchers.IO) {
            if (params.query.isBlank()) {
                throw AppFunctionInvalidArgumentException("Search query must not be empty")
            }

            val query = params.query.trim().lowercase()
            val products =
                SpressoConnectorConnector.instance.listProducts.execute().data.products
                    .filter {
                        "${it.name} ${it.brand} ${it.category} ${it.description.orEmpty()}".lowercase().contains(query)
                    }.take(5)
            SearchProductsResult(
                resultsDescription =
                    if (products.isEmpty()) {
                        "I couldn’t find a current catalog match for ${params.query}."
                    } else {
                        products.joinToString(separator = "; ") {
                            "id=${it.id}; ${it.name} by ${it.brand}, \$${"%.2f".format(it.price)}"
                        }
                    },
            )
        }
}
