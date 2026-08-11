package network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class ProductItem(
    val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val price: Double,
    val imageUrl: String
)

@Serializable
data class LensSearchResponse(
    val success: Boolean,
    val detectedResult: DetectedResult? = null,
    val apifyResults: List<ApifyProductMatch> = emptyList()
)

@Serializable
data class DetectedResult(
    val detectedItems: List<DetectedItem> = emptyList(),
    val hudAnnotationText: String? = null
)

@Serializable
data class DetectedItem(
    val detectedName: String,
    val brandGuess: String,
    val category: String,
    val priceEstimate: Double,
    val confidenceScore: Double,
    val buyActionPrompt: String? = null
)

@Serializable
data class ApifyProductMatch(
    val title: String? = null,
    val price: String? = null,
    val source: String? = null,
    val imageUrl: String? = null
)

@Serializable
data class FirestoreDocument(val name: String, val fields: Map<String, FirestoreValue>)

@Serializable
data class FirestoreValue(val stringValue: String? = null, val doubleValue: Double? = null)

@Serializable
data class FirestoreResponse(val documents: List<FirestoreDocument> = emptyList())

@Serializable
data class CheckoutOrder(val id: String)

@Serializable
data class CheckoutResponse(
    val success: Boolean,
    val message: String? = null,
    val order: CheckoutOrder? = null
)

class ApiClient {
    val client = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }
    
    private val backendBaseUrl = "https://spresso-5561f.web.app"
    
    suspend fun getInventory(): List<ProductItem> {
        return try {
            client.get("$backendBaseUrl/api/products").body()
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    private val cloudFunctionsBaseUrl = "https://us-central1-spresso-5561f.cloudfunctions.net"
    
    suspend fun requestVirtualTryOn(base64Image: String): String {
        return try {
            val response: JsonObject = client.post("$cloudFunctionsBaseUrl/generateVirtualTryOn") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("data" to mapOf("image" to base64Image)))
            }.body()
            
            // Parse response from Firebase Callable Function
            val result = response["result"]?.jsonObject
            val mediaUrl = result?.get("mediaUrl")?.jsonPrimitive?.content
            mediaUrl ?: throw Exception("Missing mediaUrl in response")
        } catch (e: Exception) {
            throw e
        }
    }
    
    suspend fun requestSpin360(productId: String): String {
        return try {
            val response: JsonObject = client.post("$cloudFunctionsBaseUrl/generateSpin360") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("data" to mapOf("productId" to productId)))
            }.body()
            
            val result = response["result"]?.jsonObject
            val mediaUrl = result?.get("mediaUrl")?.jsonPrimitive?.content
            mediaUrl ?: throw Exception("Missing mediaUrl in response")
        } catch (e: Exception) {
            throw e
        }
    }
    
    suspend fun performLensSearch(base64Image: String): LensSearchResponse {
        return try {
            client.post("$backendBaseUrl/api/lens-search") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("imageBase64" to base64Image))
            }.body()
        } catch (e: Exception) {
            LensSearchResponse(success = false)
        }
    }

    suspend fun confirmCheckoutWithToken(
        productId: String,
        quantity: Int,
        token: String,
        address: String
    ): CheckoutResponse {
        return try {
            client.post("$backendBaseUrl/api/purchase/confirm") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "productId" to productId,
                    "quantity" to quantity,
                    "userConfirmedToken" to token,
                    "deviceSource" to "WEARABLE",
                    "shippingAddress" to address
                ))
            }.body()
        } catch (e: Exception) {
            CheckoutResponse(success = false, message = e.message)
        }
    }

    fun close() {
        client.close()
    }
}
