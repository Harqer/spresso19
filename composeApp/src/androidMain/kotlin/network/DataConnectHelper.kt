package network

import com.google.firebase.functions.ktx.functions
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.tasks.await
import java.util.UUID

actual suspend fun toggleLike(productId: String, userUid: String) {
    try {
        val functions = Firebase.functions
        val data = mapOf(
            "productId" to productId,
            "idempotencyKey" to UUID.randomUUID().toString()
        )
        functions.getHttpsCallable("toggleUserLike").call(data).await()
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun getInventoryFromDataConnect(): List<ProductItem> {
    return try {
        val result = com.spresso.dataconnect.SpressoConnectorConnector.instance.listProducts.execute()
        result.data.products.map { product ->
            ProductItem(
                id = product.id,
                name = product.name,
                brand = product.brand,
                category = product.category,
                price = product.price,
                imageUrl = product.image,
                rating = 4.8,
                description = product.description
            )
        }
    } catch (e: Exception) {
        emptyList()
    }
}
