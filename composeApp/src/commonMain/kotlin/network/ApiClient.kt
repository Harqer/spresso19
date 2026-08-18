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
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.*
import network.models.ChatStreamChunk

@Serializable
data class VideoInteractionEvent(
    val uid: String,
    val itemId: String,
    @SerialName("item_embedding") val itemEmbedding: List<Double>? = null,
    @SerialName("watch_ratio") val watchRatio: Double,
    @SerialName("scroll_velocity_ms") val scrollVelocityMs: Int,
    @SerialName("pause_count") val pauseCount: Int,
    @SerialName("like_pressed") val likePressed: Boolean,
    @SerialName("shared_external") val sharedExternal: Boolean
)

@Serializable
data class ProductItem(
    val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val price: Double?,
    val imageUrl: String,
    val rating: Double? = null,
    val description: String? = null
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
    val buyActionPrompt: String? = null,
    val boundingBox: List<Double>? = null,
    val matchingCatalogId: String? = null
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
    
    private val backendBaseUrl = SpressoConfig.backendBaseUrl
    private val json = Json { ignoreUnknownKeys = true }
    
    suspend fun discoverPersonalizedProducts(): List<ProductItem> {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.DISCOVER_PERSONALIZED_PRODUCTS, "{}")
            val response = json.parseToJsonElement(responseStr).jsonObject
            val result = response["result"]?.jsonObject ?: response
            val itemsArray = result["items"]?.jsonArray
            itemsArray?.mapNotNull { item ->
                try {
                    json.decodeFromJsonElement<ProductItem>(item)
                } catch (e: Exception) {
                    null
                }
            } ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    suspend fun analyzeUserBehavior(explicitInterests: List<String>, chatHistory: List<String>? = null): JsonObject {
        return try {
            val payload = buildJsonObject {
                put("explicitInterests", buildJsonArray { explicitInterests.forEach { add(it) } })
                if (chatHistory != null) {
                    put("chatHistory", buildJsonArray { chatHistory.forEach { add(it) } })
                }
            }
            val responseStr = callFirebaseFunction(FirebaseRoutes.ANALYZE_USER_BEHAVIOR, payload.toString())
            val response = json.parseToJsonElement(responseStr).jsonObject
            response["result"]?.jsonObject ?: response
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }
    
    private val cloudFunctionsBaseUrl = SpressoConfig.cloudFunctionsBaseUrl
    
    suspend fun verifyEmailCredential(credential: String, nonce: String): String? {
        return try {
            val responseJson = callFirebaseFunction(FirebaseRoutes.VERIFY_EMAIL_CREDENTIAL, """{"credential":"$credential","nonce":"$nonce"}""")
            val response = json.parseToJsonElement(responseJson).jsonObject
            val result = response["result"]?.jsonObject ?: response
            result["custom_token"]?.jsonPrimitive?.content
        } catch (e: Exception) {
            null
        }
    }

    suspend fun recordInteraction(productId: String, action: String): Boolean {
        logCrashlyticsBreadcrumb(action, "productId=$productId")
        return try {
            callFirebaseFunction(FirebaseRoutes.INGEST_INTERACTION, """{"productId":"$productId","action":"$action"}""")
            true
        } catch (e: Exception) {
            false
        }
    }

    open suspend fun streamTelemetry(event: VideoInteractionEvent): Boolean {
        // Post asynchronously to the new Python FastAPI /telemetry/ingest endpoint
        // Using dynamic config host:
        val url = "${SpressoConfig.backendBaseUrl}/telemetry/ingest"
        return try {
            client.post(url) {
                contentType(ContentType.Application.Json)
                setBody(event)
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun requestVirtualTryOn(base64Image: String): String {
        return try {
            val responseJson = callFirebaseFunction(FirebaseRoutes.GENERATE_VIRTUAL_TRY_ON, """{"image":"$base64Image"}""")
            val response = json.parseToJsonElement(responseJson).jsonObject
            val result = response["result"]?.jsonObject ?: response
            result["mediaUrl"]?.jsonPrimitive?.content ?: throw Exception("Missing mediaUrl in response")
        } catch (e: Exception) {
            throw e
        }
    }
    
    suspend fun requestSpin360(productId: String): String {
        return try {
            val responseJson = callFirebaseFunction(FirebaseRoutes.GENERATE_SPIN_360, """{"productId":"$productId"}""")
            val response = json.parseToJsonElement(responseJson).jsonObject
            val result = response["result"]?.jsonObject ?: response
            result["mediaUrl"]?.jsonPrimitive?.content ?: throw Exception("Missing mediaUrl in response")
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
        val url = "$cloudFunctionsBaseUrl/${FirebaseRoutes.CHAT_STREAM}"
        
        try {
            val response = client.post(url) {
                contentType(ContentType.Application.Json)
                if (authToken != null) {
                    header(HttpHeaders.Authorization, "Bearer $authToken")
                }
                setBody(mapOf(
                    "data" to mapOf(
                        "prompt" to prompt,
                        "imageBase64" to imageBase64,
                        "location" to location,
                        "latLng" to latLng?.let { mapOf("latitude" to it.first, "longitude" to it.second) },
                        "agentType" to agentType
                    )
                ))
            }
            
            val responseBody = response.bodyAsText()
            try {
                // Parse Firebase Callable response format: {"result": {"response": "..."}}
                val jsonResponse = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }.parseToJsonElement(responseBody)
                val result = jsonResponse.jsonObject["result"]?.jsonObject
                val text = result?.get("response")?.jsonPrimitive?.content ?: "Sorry, I couldn't process that."
                emit(ChatStreamChunk(type = "text", text = text))
                emit(ChatStreamChunk(type = "done"))
            } catch (e: Exception) {
                emit(ChatStreamChunk(type = "text", text = "Error parsing response: ${e.message}"))
                emit(ChatStreamChunk(type = "done"))
            }
        } catch (e: Exception) {
            emit(ChatStreamChunk(type = "text", text = "Network error: ${e.message}"))
            emit(ChatStreamChunk(type = "done"))
        }
    }
    
    open suspend fun performLensSearch(base64Image: String): LensSearchResponse {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.IDENTIFY_VISION_OBJECT, """{"imageBase64":"$base64Image"}""")
            json.decodeFromString<LensSearchResponse>(responseStr)
        } catch (e: Exception) {
            throw Exception("Failed to perform Spresso Lens Search: ${e.message}", e)
        }
    }

    suspend fun performAccessibilityLensSearch(base64Image: String): LensSearchResponse {
        return performLensSearch(base64Image)
    }

    suspend fun confirmCheckoutWithToken(
        productId: String,
        quantity: Int,
        token: String,
        address: String
    ): CheckoutResponse {
        val payloadStr = "{\"productId\":\"$productId\",\"quantity\":$quantity,\"userConfirmedToken\":\"$token\",\"deviceSource\":\"WEARABLE\",\"shippingAddress\":\"$address\"}"
        val signature = promptBiometricAuth("Confirm your identity to purchase this item.", payloadStr)
        if (signature == null) {
            return CheckoutResponse(success = false, message = "Biometric authentication failed or was cancelled.")
        }
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.CONFIRM_PURCHASE, payloadStr)
            val response = json.parseToJsonElement(responseStr).jsonObject
            val result = response["result"]?.jsonObject ?: response
            json.decodeFromJsonElement<CheckoutResponse>(result)
        } catch (e: Exception) {
            CheckoutResponse(success = false, message = e.message)
        }
    }

    suspend fun requestOrderReturn(orderId: String, reason: String): JsonObject {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.INITIATE_ORDER_RETURN, """{"orderId":"$orderId","reason":"$reason"}""")
            val response = json.parseToJsonElement(responseStr).jsonObject
            response["result"]?.jsonObject ?: response
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun setOrderReminder(orderId: String, reminderTime: String): JsonObject {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.SET_ORDER_REMINDER, """{"orderId":"$orderId","reminderTime":"$reminderTime"}""")
            val response = json.parseToJsonElement(responseStr).jsonObject
            response["result"]?.jsonObject ?: response
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun generateCreatorCampaign(prompt: String, templateId: String): JsonObject {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_CREATOR_CAMPAIGN, """{"prompt":"$prompt","templateId":"$templateId"}""")
            val response = json.parseToJsonElement(responseStr).jsonObject
            response["result"]?.jsonObject ?: response
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun generateRecipeBargainChef(prompt: String, ingredients: List<String> = emptyList()): JsonObject {
        return try {
            val ingredientsJson = ingredients.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }
            val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_RECIPE_BARGAIN_CHEF, """{"prompt":"$prompt","ingredients":$ingredientsJson}""")
            val response = json.parseToJsonElement(responseStr).jsonObject
            response["result"]?.jsonObject ?: response
        } catch (e: Exception) {
            JsonObject(emptyMap())
        }
    }

    suspend fun fetchUserProfile(uid: String): network.models.UserProfileData {
        val responseStr = callFirebaseFunction(FirebaseRoutes.GET_USER_PROFILE, """{"uid":"$uid"}""")
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return json.decodeFromJsonElement(result)
    }

    suspend fun updateUserProfile(profile: network.models.UserProfileData): Boolean {
        return try {
            upsertUserProfile(
                email = profile.email,
                displayName = profile.name,
                avatarUrl = profile.avatarUrl
            )
            upsertUserPreference(
                theme = profile.themePreference,
                pushNotifications = profile.notificationsEnabled,
                emailAlerts = profile.emailAlertsEnabled
            )
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun deactivateAccount(uid: String): Boolean {
        return try {
            callFirebaseFunction(FirebaseRoutes.DEACTIVATE_ACCOUNT, """{"uid":"$uid"}""")
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun fetchTravelTrips(): List<components.models.TripRecord> {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.GET_TRAVEL_TRIPS, "{}")
            val response = json.parseToJsonElement(responseStr).jsonObject
            val result = response["result"]?.jsonObject ?: response
            val tripsArray = result["trips"]?.jsonArray
            tripsArray?.mapNotNull { item ->
                val obj = item.jsonObject
                components.models.TripRecord(
                    id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                    title = obj["title"]?.jsonPrimitive?.content ?: "Untitled Trip",
                    destination = obj["destination"]?.jsonPrimitive?.content ?: "",
                    startDate = obj["start_date"]?.jsonPrimitive?.content ?: "",
                    endDate = obj["end_date"]?.jsonPrimitive?.content ?: "",
                    status = obj["status"]?.jsonPrimitive?.content ?: "UPCOMING",
                    coverImage = obj["cover_image"]?.jsonPrimitive?.content ?: "",
                    budgetTotal = obj["budget_total"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0,
                    spentTotal = obj["spent_total"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
                )
            } ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun initializeOnboarding(uid: String, interests: List<String>) {
        try {
            client.post("${SpressoConfig.backendBaseUrl}/onboarding/initialize") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("uid" to uid, "interests" to interests))
            }
        } catch (e: Exception) {
            // Log silently
            println("Failed to initialize onboarding: ${e.message}")
        }
    }

    fun close() {
        client.close()
    }

    suspend fun addGroceryItem(listId: String, productName: String, productId: String?, addedVia: String): Boolean {
        return try {
            network.addGroceryItem(listId, productName, productId, addedVia)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun toggleGroceryItem(id: String, isPurchased: Boolean): Boolean {
        return try {
            network.toggleGroceryItem(id, isPurchased)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun deleteGroceryItem(id: String): Boolean {
        return try {
            network.deleteGroceryItem(id)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun createPaymentMethod(stripePaymentMethodId: String): Boolean {
        return try {
            network.createPaymentMethod(stripePaymentMethodId)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun updateUserSubscription(id: String, tier: String): Boolean {
        return try {
            network.updateUserSubscription(id, tier)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun createOrder(authorizationId: String, productId: String, quantity: Int, totalAmount: Float, shippingAddress: String?, deviceSource: String, paymentMethod: String, userConfirmedToken: String?): Boolean {
        return try {
            network.createOrder(authorizationId, productId, quantity, totalAmount, shippingAddress, deviceSource, paymentMethod, userConfirmedToken)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun connectCoinbaseWallet(address: String): Boolean {
        return try {
            network.connectCoinbaseWallet(address)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun registerPasskey(credentialId: String, publicKey: String): Boolean {
        return try {
            network.registerPasskey(credentialId, publicKey)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun generatePasskeyChallenge(): String {
        return try {
            val responseJson = callFirebaseFunction(FirebaseRoutes.GENERATE_PASSKEY_CHALLENGE, "{}")
            val response = json.parseToJsonElement(responseJson).jsonObject
            val result = response["result"]?.jsonObject ?: response
            result["challenge"]?.jsonPrimitive?.content ?: ""
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }
    suspend fun verifyPasskeyRegistration(responseJson: String, challenge: String): Boolean {
        return try {
            val payload = buildJsonObject {
                put("responseJson", responseJson)
                put("challenge", challenge)
            }
            val responseStr = callFirebaseFunction(FirebaseRoutes.VERIFY_PASSKEY_REGISTRATION, payload.toString())
            val response = json.parseToJsonElement(responseStr).jsonObject
            val result = response["result"]?.jsonObject ?: response
            result["success"]?.jsonPrimitive?.boolean ?: false
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun generateGoogleWalletPassJwt(passType: String = "loyalty"): String {
        return try {
            val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_GOOGLE_WALLET_PASS_JWT, """{"passType":"$passType"}""")
            val response = json.parseToJsonElement(responseStr).jsonObject
            val result = response["result"]?.jsonObject ?: response
            result["jwt"]?.jsonPrimitive?.content ?: ""
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }
}
