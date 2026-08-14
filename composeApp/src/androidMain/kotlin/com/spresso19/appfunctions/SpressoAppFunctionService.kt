package com.spresso19.appfunctions

import androidx.appfunctions.AppFunction
import androidx.appfunctions.AppFunctionService
import androidx.appfunctions.AppFunctionServiceEntryPoint
import androidx.appfunctions.AppFunctionSerializable
import androidx.appfunctions.AppFunctionInvalidArgumentException
import androidx.annotation.RequiresApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** The parameter to order a coffee. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class OrderCoffeeParams(
    /** The type of coffee, e.g. Latte, Espresso, Cappuccino. */
    val coffeeType: String,
    /** The size of the coffee, must be Small, Medium, or Large. */
    val size: String,
    /** Any additional instructions. */
    val instructions: String? = null
)

/** The result of a coffee order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class CoffeeOrderResult(
    /** The ID of the placed order. */
    val orderId: String,
    /** A confirmation message. */
    val confirmationMessage: String,
    /** Estimated time in minutes. */
    val estimatedTimeMinutes: Int
)

/** The parameter to save a wardrobe item. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class SaveWardrobeItemParams(
    /** The name of the item. */
    val itemName: String,
    /** The category, e.g. Top, Bottom, Shoes. */
    val category: String,
    /** The color of the item. */
    val color: String? = null
)

/** The result of saving a wardrobe item. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class SaveWardrobeItemResult(
    /** The ID of the saved item. */
    val itemId: String,
    /** A confirmation message. */
    val confirmationMessage: String
)

/** The parameter to view an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class ViewOrderParams(
    /** The ID of the order to view. */
    val orderId: String
)

/** The result of viewing an order. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class ViewOrderResult(
    /** The ID of the order. */
    val orderId: String,
    /** The status of the order. */
    val status: String,
    /** The details of the items in the order. */
    val itemsDescription: String
)

@RequiresApi(36)
@AppFunctionServiceEntryPoint(
    serviceName = "SpressoAppFunctionService",
    appFunctionXmlFileName = "spresso_app_function_service",
)
abstract class BaseSpressoAppFunctionService : AppFunctionService() {

    /**
     * Order a coffee.
     * Required workflow: Call this to place a new coffee order.
     * @param params The parameter to describe how to order the coffee.
     * @return The result of the coffee order.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun orderCoffee(
        params: OrderCoffeeParams,
    ): CoffeeOrderResult = withContext(Dispatchers.IO) {
        if (params.size !in listOf("Small", "Medium", "Large")) {
            throw AppFunctionInvalidArgumentException("Size must be Small, Medium, or Large")
        }
        
        CoffeeOrderResult(
            orderId = "COFFEE-" + System.currentTimeMillis(),
            confirmationMessage = "Ordered ${params.size} ${params.coffeeType}",
            estimatedTimeMinutes = 5
        )
    }

    /**
     * Save an item to the wardrobe.
     * Required workflow: Call this to add a new clothing item to the user's wardrobe.
     * @param params The parameter to describe the wardrobe item.
     * @return The result of the save operation.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun saveWardrobeItem(
        params: SaveWardrobeItemParams,
    ): SaveWardrobeItemResult = withContext(Dispatchers.IO) {
        if (params.itemName.isBlank()) {
            throw AppFunctionInvalidArgumentException("Item name must not be empty")
        }
        
        SaveWardrobeItemResult(
            itemId = "WARDROBE-" + System.currentTimeMillis(),
            confirmationMessage = "Saved ${params.color ?: ""} ${params.itemName} to ${params.category}"
        )
    }

    /**
     * View the details of an existing order.
     * Required workflow: Call this to retrieve details for an order using its ID.
     * @param params The parameter specifying the order ID.
     * @return The details of the requested order.
     */
    @AppFunction(isDescribedByKDoc = true)
    suspend fun viewOrder(
        params: ViewOrderParams,
    ): ViewOrderResult = withContext(Dispatchers.IO) {
        if (params.orderId.isBlank()) {
            throw AppFunctionInvalidArgumentException("Order ID must not be empty")
        }
        
        ViewOrderResult(
            orderId = params.orderId,
            status = "Processing",
            itemsDescription = "Order details for ${params.orderId}"
        )
    }
}
