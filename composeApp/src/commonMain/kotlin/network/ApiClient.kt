package network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.HttpHeaders
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import network.models.ChatStreamChunk

@Serializable
data class ProductItem(
    val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val price: Double,
    val imageUrl: String,
    val rating: Double? = 4.8
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

open class ApiClient {
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
    private val json = Json { ignoreUnknownKeys = true }
    
    suspend fun getInventory(): List<ProductItem> {
        val authToken = getCurrentUserIdToken()
        val endpoints = listOf("$backendBaseUrl/api/products", "$backendBaseUrl/api/inventory")
        for (endpoint in endpoints) {
            try {
                val responseText = client.get(endpoint) {
                    if (authToken != null) {
                        header(HttpHeaders.Authorization, "Bearer $authToken")
                    }
                }.bodyAsText()
                val jsonElement = json.parseToJsonElement(responseText)
                val productsArray = when {
                    jsonElement is JsonArray -> jsonElement
                    jsonElement is JsonObject && jsonElement.containsKey("products") -> jsonElement["products"]?.jsonArray
                    jsonElement is JsonObject && jsonElement.containsKey("inventory") -> jsonElement["inventory"]?.jsonArray
                    jsonElement is JsonObject && jsonElement.containsKey("items") -> jsonElement["items"]?.jsonArray
                    else -> null
                }
                if (productsArray != null && productsArray.isNotEmpty()) {
                    return productsArray.mapNotNull { item ->
                        val obj = item.jsonObject
                        val id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null
                        val name = obj["name"]?.jsonPrimitive?.content ?: "Product"
                        val brand = obj["brand"]?.jsonPrimitive?.content ?: "Spresso Store"
                        val category = obj["category"]?.jsonPrimitive?.content ?: "Apparel"
                        val price = obj["price"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
                        val imageUrl = obj["image"]?.jsonPrimitive?.content ?: obj["imageUrl"]?.jsonPrimitive?.content ?: ""
                        val rating = obj["rating"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 4.8
                        ProductItem(id, name, brand, category, price, imageUrl, rating)
                    }
                }
            } catch (_: Exception) {
                // Try next endpoint
            }
        }
        return emptyList()
    }
    
    private val cloudFunctionsBaseUrl = "https://us-central1-spresso-5561f.cloudfunctions.net"
    
    suspend fun requestVirtualTryOn(base64Image: String): String {
        val authToken = getCurrentUserIdToken()
        return try {
            val response: JsonObject = client.post("$cloudFunctionsBaseUrl/generateVirtualTryOn") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("data" to mapOf("image" to base64Image)))
            }.body()
            
            val result = response["result"]?.jsonObject
            val mediaUrl = result?.get("mediaUrl")?.jsonPrimitive?.content
            mediaUrl ?: throw Exception("Missing mediaUrl in response")
        } catch (e: Exception) {
            throw e
        }
    }
    
    suspend fun requestSpin360(productId: String): String {
        val authToken = getCurrentUserIdToken()
        return try {
            val response: JsonObject = client.post("$cloudFunctionsBaseUrl/generateSpin360") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("data" to mapOf("productId" to productId)))
            }.body()
            
            val result = response["result"]?.jsonObject
            val mediaUrl = result?.get("mediaUrl")?.jsonPrimitive?.content
            mediaUrl ?: throw Exception("Missing mediaUrl in response")
        } catch (e: Exception) {
            throw e
        }
    }

    open fun streamChat(
        prompt: String,
        imageBase64: String? = null,
        location: String? = null,
        latLng: Pair<Double, Double>? = null,
        agentType: String? = null
    ): Flow<ChatStreamChunk> = flow {
        val authToken = getCurrentUserIdToken()
        val url = "$backendBaseUrl/api/chat/stream"
        
        client.preparePost(url) {
            contentType(ContentType.Application.Json)
            if (authToken != null) {
                header(HttpHeaders.Authorization, "Bearer $authToken")
            }
            setBody(mapOf(
                "prompt" to prompt,
                "imageBase64" to imageBase64,
                "location" to location,
                "latLng" to latLng?.let { mapOf("latitude" to it.first, "longitude" to it.second) },
                "agentType" to agentType
            ))
        }.execute { response ->
            val channel = response.bodyAsChannel()
            while (!channel.isClosedForRead) {
                val line = channel.readUTF8Line() ?: break
                val cleanedLine = line.trim()
                if (cleanedLine.startsWith("data:")) {
                    val data = cleanedLine.substring(5).trim()
                    if (data == "[DONE]") break
                    if (data.isNotEmpty()) {
                        try {
                            val chunk = json.decodeFromString<ChatStreamChunk>(data)
                            emit(chunk)
                        } catch (_: Exception) {
                            emit(ChatStreamChunk(type = "text", text = data))
                        }
                    }
                }
            }
        }
    }
    
    open suspend fun performLensSearch(base64Image: String): LensSearchResponse {
        val authToken = getCurrentUserIdToken()
        return try {
            client.post("$backendBaseUrl/api/lens-search") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("imageBase64" to base64Image))
            }.body()
        } catch (_: Exception) {
            LensSearchResponse(success = false)
        }
    }

    suspend fun performAccessibilityLensSearch(base64Image: String): LensSearchResponse {
        val authToken = getCurrentUserIdToken() ?: return LensSearchResponse(success = false)
        return try {
            client.post("$backendBaseUrl/api/accessibility/lens-search") {
                contentType(ContentType.Application.Json)
                header(HttpHeaders.Authorization, "Bearer $authToken")
                setBody(mapOf("imageBase64" to base64Image))
            }.body()
        } catch (_: Exception) {
            LensSearchResponse(success = false)
        }
    }

    suspend fun confirmCheckoutWithToken(
        productId: String,
        quantity: Int,
        token: String,
        address: String
    ): CheckoutResponse {
        val authToken = getCurrentUserIdToken()
        return try {
            client.post("$backendBaseUrl/api/purchase/confirm") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
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

    suspend fun requestOrderReturn(orderId: String, reason: String): JsonObject {
        val authToken = getCurrentUserIdToken()
        return try {
            client.post("$backendBaseUrl/api/orders/return") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("orderId" to orderId, "reason" to reason))
            }.body()
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun setOrderReminder(orderId: String, reminderTime: String): JsonObject {
        val authToken = getCurrentUserIdToken()
        return try {
            client.post("$backendBaseUrl/api/orders/reminder") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("orderId" to orderId, "reminderTime" to reminderTime))
            }.body()
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun generateCreatorCampaign(prompt: String, templateId: String): JsonObject {
        val authToken = getCurrentUserIdToken()
        return try {
            client.post("$backendBaseUrl/api/creator/generate-campaign") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("prompt" to prompt, "templateId" to templateId))
            }.body()
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun generateRecipeBargainChef(prompt: String, ingredients: List<String> = emptyList()): JsonObject {
        val authToken = getCurrentUserIdToken()
        return try {
            client.post("$backendBaseUrl/api/recipe/bargain-chef") {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf("prompt" to prompt, "ingredients" to ingredients))
            }.body()
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    fun close() {
        client.close()
    }
}
