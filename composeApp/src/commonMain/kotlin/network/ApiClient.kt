package network

import components.models.TripRecord
import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import network.models.ChatStreamChunk
import network.models.UserProfileData
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import network.addGroceryItem as addGroceryItemTopLevel
import network.createOrder as createOrderTopLevel
import network.createPaymentMethod as createPaymentMethodTopLevel
import network.deleteGroceryItem as deleteGroceryItemTopLevel
import network.deletePaymentMethod as deletePaymentMethodTopLevel
import network.registerPasskey as registerPasskeyTopLevel
import network.toggleGroceryItem as toggleGroceryItemTopLevel
import network.updateUserSubscription as updateUserSubscriptionTopLevel

@Serializable
data class VideoInteractionEvent(
    val uid: String,
    val itemId: String,
    @SerialName("item_embedding") val itemEmbedding: List<Double>? = null,
    @SerialName("watch_ratio") val watchRatio: Double,
    @SerialName("scroll_velocity_ms") val scrollVelocityMs: Int,
    @SerialName("pause_count") val pauseCount: Int,
    @SerialName("like_pressed") val likePressed: Boolean,
    @SerialName("shared_external") val sharedExternal: Boolean,
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
    val description: String? = null,
)

@Serializable
data class LensSearchResponse(
    val success: Boolean,
    val detectedResult: DetectedResult? = null,
    val apifyResults: List<ApifyProductMatch> = emptyList(),
)

@Serializable
data class DetectedResult(
    val detectedItems: List<DetectedItem> = emptyList(),
    val hudAnnotationText: String? = null,
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

@Serializable
data class ApifyProductMatch(
    val title: String? = null,
    val price: String? = null,
    val source: String? = null,
    val imageUrl: String? = null,
)

@Serializable
data class FirestoreDocument(
    val name: String,
    val fields: Map<String, FirestoreValue>,
)

@Serializable
data class FirestoreValue(
    val stringValue: String? = null,
    val doubleValue: Double? = null,
)

@Serializable
data class FirestoreResponse(
    val documents: List<FirestoreDocument> = emptyList(),
)

@Serializable
data class CheckoutOrder(
    val id: String,
)

@Serializable
data class CheckoutResponse(
    val success: Boolean,
    val message: String? = null,
    val order: CheckoutOrder? = null,
)

open class ApiClient {
    val client =
        HttpClient {
            install(ContentNegotiation) {
                json(
                    Json {
                        prettyPrint = true
                        isLenient = true
                        ignoreUnknownKeys = true
                    },
                )
            }
        }

    private val json = Json { ignoreUnknownKeys = true }

    private fun JsonObject.string(key: String): String = this[key]?.jsonPrimitive?.content ?: ""
    private fun JsonObject.double(key: String): Double = this[key]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
    private fun JsonObject.jsonArray(key: String) = this[key]?.jsonArray ?: emptyList<kotlinx.serialization.json.JsonElement>()

    suspend fun discoverPersonalizedProducts(): List<ProductItem> {
        val responseStr = callFirebaseFunction(FirebaseRoutes.DISCOVER_PERSONALIZED_PRODUCTS, "{}")
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        val itemsArray = result["items"]?.jsonArray
        return itemsArray?.mapNotNull { item ->
            try {
                json.decodeFromJsonElement<ProductItem>(item)
            } catch (e: Exception) {
                null
            }
        } ?: emptyList()
    }

    suspend fun analyzeUserBehavior(
        explicitInterests: List<String>,
        chatHistory: List<String>? = null,
    ): JsonObject {
        val payload =
            buildJsonObject {
                put("explicitInterests", buildJsonArray { explicitInterests.forEach { add(it) } })
                if (chatHistory != null) {
                    put("chatHistory", buildJsonArray { chatHistory.forEach { add(it) } })
                }
            }
        val responseStr = callFirebaseFunction(FirebaseRoutes.ANALYZE_USER_BEHAVIOR, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        return response["result"]?.jsonObject ?: response
    }

    private val cloudFunctionsBaseUrl = SpressoConfig.cloudFunctionsBaseUrl

    suspend fun verifyEmailCredential(
        credential: String,
        nonce: String,
    ): String? {
        val payload =
            buildJsonObject {
                put("credential", credential)
                put("nonce", nonce)
            }
        val responseJson = callFirebaseFunction(FirebaseRoutes.VERIFY_EMAIL_CREDENTIAL, payload.toString())
        val response = json.parseToJsonElement(responseJson).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["custom_token"]?.jsonPrimitive?.content
    }

    suspend fun recordInteraction(
        productId: String,
        action: String,
    ): Boolean {
        logCrashlyticsBreadcrumb(action, "productId=$productId")
        val payload =
            buildJsonObject {
                put("productId", productId)
                put("action", action)
            }
        callFirebaseFunction(FirebaseRoutes.INGEST_INTERACTION, payload.toString())
        return true
    }

    open suspend fun streamTelemetry(event: VideoInteractionEvent): Boolean {
        val payload = buildJsonObject {
            put("productId", event.itemId)
            put("action", "video_interaction")
        }
        callFirebaseFunction(FirebaseRoutes.INGEST_INTERACTION, payload.toString())
        return true
    }

    suspend fun requestVirtualTryOn(base64Image: String): String {
        val payload = buildJsonObject { put("image", base64Image) }
        val responseJson = callFirebaseFunction(FirebaseRoutes.GENERATE_VIRTUAL_TRY_ON, payload.toString())
        val response = json.parseToJsonElement(responseJson).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["mediaUrl"]?.jsonPrimitive?.content ?: throw Exception("Missing mediaUrl in response")
    }

    suspend fun requestSpin360(productId: String): String {
        val payload = buildJsonObject { put("productId", productId) }
        val responseJson = callFirebaseFunction(FirebaseRoutes.GENERATE_SPIN_360, payload.toString())
        val response = json.parseToJsonElement(responseJson).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["mediaUrl"]?.jsonPrimitive?.content ?: throw Exception("Missing mediaUrl in response")
    }

    open fun streamChat(
        prompt: String,
        imageBase64: String? = null,
        location: String? = null,
        latLng: Pair<Double, Double>? = null,
        agentType: String? = null,
    ): Flow<ChatStreamChunk> =
        flow {
            val authToken = getCurrentUserIdToken()
            val url = "${cloudFunctionsBaseUrl}/${FirebaseRoutes.CHAT_STREAM}"

            try {
                val response =
                    client.post(url) {
                        contentType(ContentType.Application.Json)
                        if (authToken != null) {
                            header(HttpHeaders.Authorization, "Bearer $authToken")
                        }
                        val localeHelper = com.spresso19.translation.LocaleHelper()
                        val locale = localeHelper.getCurrentLocale()
                        setBody(
                            mapOf(
                                "prompt" to prompt,
                                "imageBase64" to imageBase64,
                                "location" to location,
                                "latLng" to latLng?.let { mapOf("latitude" to it.first, "longitude" to it.second) },
                                "agentType" to agentType,
                                "locale" to locale,
                            ),
                        )
                    }

                val responseBody = response.bodyAsText()
                responseBody.lineSequence()
                    .filter { it.startsWith("data: ") }
                    .map { it.removePrefix("data: ").trim() }
                    .filter { it != "[DONE]" }
                    .forEach { event ->
                        val text = runCatching { json.parseToJsonElement(event).jsonObject["text"]?.jsonPrimitive?.content }.getOrNull()
                        if (!text.isNullOrEmpty()) emit(ChatStreamChunk(type = "text", text = text))
                    }
                emit(ChatStreamChunk(type = "done"))
            } catch (e: Exception) {
                emit(ChatStreamChunk(type = "text", text = "I couldn't connect right now. Please try again."))
                emit(ChatStreamChunk(type = "done"))
            }
        }

    open suspend fun performLensSearch(base64Image: String): LensSearchResponse =
        try {
            val payload = buildJsonObject { put("imageBase64", base64Image) }
            val responseStr = callFirebaseFunction(FirebaseRoutes.IDENTIFY_VISION_OBJECT, payload.toString())
            json.decodeFromString<LensSearchResponse>(responseStr)
        } catch (e: Exception) {
            throw Exception("Failed to perform Spresso Lens Search: \${e.message}", e)
        }

    suspend fun performAccessibilityLensSearch(base64Image: String): LensSearchResponse = performLensSearch(base64Image)

    suspend fun confirmCheckoutWithToken(
        productId: String,
        quantity: Int,
        token: String,
        address: String,
    ): CheckoutResponse {
        val payloadObj =
            buildJsonObject {
                put("productId", productId)
                put("quantity", quantity)
                put("userConfirmedToken", token)
                put("deviceSource", "WEARABLE")
                put("shippingAddress", address)
            }
        val payloadStr = payloadObj.toString()
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

    suspend fun requestOrderReturn(
        orderId: String,
        reason: String,
    ): JsonObject {
        val payload =
            buildJsonObject {
                put("orderId", orderId)
                put("reason", reason)
            }
        val responseStr = callFirebaseFunction(FirebaseRoutes.INITIATE_ORDER_RETURN, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        return response["result"]?.jsonObject ?: response
    }

    suspend fun setOrderReminder(
        orderId: String,
        reminderTime: String,
    ): JsonObject {
        val payload =
            buildJsonObject {
                put("orderId", orderId)
                put("reminderTime", reminderTime)
            }
        val responseStr = callFirebaseFunction(FirebaseRoutes.SET_ORDER_REMINDER, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        return response["result"]?.jsonObject ?: response
    }

    suspend fun generateCreatorCampaign(
        prompt: String,
        templateId: String,
    ): JsonObject {
        val payload =
            buildJsonObject {
                put("prompt", prompt)
                put("templateId", templateId)
            }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_CREATOR_CAMPAIGN, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        return response["result"]?.jsonObject ?: response
    }

    suspend fun generateRecipeBargainChef(
        prompt: String,
        ingredients: List<String> = emptyList(),
    ): JsonObject {
        val payload =
            buildJsonObject {
                put("prompt", prompt)
                put("ingredients", buildJsonArray { ingredients.forEach { add(it) } })
            }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_RECIPE_BARGAIN_CHEF, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        return response["result"]?.jsonObject ?: response
    }

    suspend fun fetchUserProfile(uid: String): UserProfileData {
        val payload = buildJsonObject { put("uid", uid) }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GET_USER_PROFILE, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return json.decodeFromJsonElement(result)
    }

    suspend fun updateUserProfile(profile: UserProfileData): Boolean {
        upsertUserProfile(
            email = profile.email,
            displayName = profile.name,
            avatarUrl = profile.avatarUrl,
        )
        upsertUserPreference(
            theme = profile.themePreference,
            pushNotifications = profile.notificationsEnabled,
            emailAlerts = profile.emailAlertsEnabled,
        )
        return true
    }

    suspend fun deactivateAccount(uid: String): Boolean {
        val payload = buildJsonObject { put("uid", uid) }
        callFirebaseFunction(FirebaseRoutes.DEACTIVATE_ACCOUNT, payload.toString())
        return true
    }

    suspend fun fetchTravelTrips(): List<TripRecord> {
        val responseStr = callFirebaseFunction(FirebaseRoutes.GET_TRAVEL_TRIPS, "{}")
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        val tripsArray = result["trips"]?.jsonArray
        return tripsArray?.mapNotNull { item ->
            val obj = item.jsonObject
            TripRecord(
                id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                title = obj.string("title"),
                destination = obj.string("destination"),
                startDate = obj.string("start_date").ifEmpty { obj.string("startDate") },
                endDate = obj.string("end_date").ifEmpty { obj.string("endDate") },
                status = obj.string("status"),
                coverImage = obj.string("cover_image").ifEmpty { obj.string("coverImage") },
                budgetTotal = obj.double("budget_total"),
                spentTotal = obj.double("spent_total"),
            )
        } ?: emptyList()
    }

    suspend fun fetchTravelEvents(tripId: String): List<components.models.ItineraryEvent> {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_TRAVEL_EVENTS, buildJsonObject { put("tripId", tripId) }.toString())).jsonObject
        return response.jsonArray("events").mapNotNull { item ->
            val obj = item.jsonObject
            val id = obj.string("id")
            if (id.isEmpty()) return@mapNotNull null
            components.models.ItineraryEvent(id, tripId, obj.string("type"), obj.string("title"), obj.string("description"), obj.string("eventTime"), obj.string("location"), obj.double("price"))
        }
    }

    suspend fun fetchTravelExpenses(tripId: String): List<components.models.TravelExpense> {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_TRAVEL_EXPENSES, buildJsonObject { put("tripId", tripId) }.toString())).jsonObject
        return response.jsonArray("expenses").mapNotNull { item ->
            val obj = item.jsonObject
            val id = obj.string("id")
            if (id.isEmpty()) return@mapNotNull null
            components.models.TravelExpense(id, tripId, obj.double("amount"), obj.string("currency"), obj.string("category"), obj.string("merchant"), obj.string("date"))
        }
    }

    suspend fun fetchVoiceNotes(tripId: String): List<components.models.VoiceNote> {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_VOICE_NOTES, buildJsonObject { put("tripId", tripId) }.toString())).jsonObject
        return response.jsonArray("voiceNotes").mapNotNull { item ->
            val obj = item.jsonObject
            val id = obj.string("id")
            if (id.isEmpty()) return@mapNotNull null
            components.models.VoiceNote(id, tripId, obj.string("transcript"), obj.string("createdAt"))
        }
    }

    suspend fun fetchGroceryList(listId: String): List<network.models.GroceryItem> {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_GROCERY_ITEMS, buildJsonObject { put("listId", listId) }.toString())).jsonObject
        return response.jsonArray("items").mapNotNull { item -> runCatching { json.decodeFromJsonElement<network.models.GroceryItem>(item) }.getOrNull() }
    }

    suspend fun initializeOnboarding(
        uid: String,
        interests: List<String>,
    ) {
        val payload =
            buildJsonObject {
                put("uid", uid)
                put("interests", buildJsonArray { interests.forEach { add(it) } })
            }
        callFirebaseFunction(FirebaseRoutes.INITIALIZE_ONBOARDING, payload.toString())
    }

    suspend fun connectCoinbaseWallet(address: String): Boolean {
        val payload = buildJsonObject { put("address", address); put("network", "base") }
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.CONNECT_COINBASE_WALLET, payload.toString())).jsonObject
        return (response["result"]?.jsonObject ?: response)["success"]?.jsonPrimitive?.boolean == true
    }

    fun close() {
        client.close()
    }

    suspend fun addGroceryItem(
        listId: String,
        productName: String,
        productId: String?,
        addedVia: String,
    ): Boolean {
        addGroceryItemTopLevel(listId, productName, productId, addedVia)
        return true
    }

    suspend fun toggleGroceryItem(
        id: String,
        isPurchased: Boolean,
    ): Boolean {
        toggleGroceryItemTopLevel(id, isPurchased)
        return true
    }

    suspend fun deleteGroceryItem(id: String): Boolean {
        deleteGroceryItemTopLevel(id)
        return true
    }

    suspend fun removePaymentMethod(id: String): Boolean {
        deletePaymentMethodTopLevel(id)
        return true
    }

    @OptIn(ExperimentalEncodingApi::class)
    suspend fun generateResponseFromAudio(
        prompt: String,
        audioData: ByteArray,
        mimeType: String = "audio/mp3",
    ): String {
        val payload =
            buildJsonObject {
                put("prompt", prompt)
                put("audioBase64", Base64.encode(audioData))
                put("mimeType", mimeType)
            }
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GENERATE_RESPONSE_FROM_AUDIO, payload.toString())).jsonObject
        return (response["result"]?.jsonObject ?: response)["text"]?.jsonPrimitive?.content
            ?: throw Exception("Invalid response format")
    }

    suspend fun createPaymentMethod(stripePaymentMethodId: String): Boolean {
        createPaymentMethodTopLevel(stripePaymentMethodId)
        return true
    }

    suspend fun updateUserSubscription(
        id: String,
        tier: String,
    ): Boolean {
        updateUserSubscriptionTopLevel(id, tier)
        return true
    }

    suspend fun createOrder(
        authorizationId: String,
        productId: String,
        quantity: Int,
        totalAmount: Float,
        shippingAddress: String?,
        deviceSource: String,
        paymentMethod: String,
        userConfirmedToken: String?,
    ): Boolean {
        createOrderTopLevel(
            authorizationId,
            productId,
            quantity,
            totalAmount,
            shippingAddress,
            deviceSource,
            paymentMethod,
            userConfirmedToken,
        )
        return true
    }

    suspend fun registerPasskey(
        credentialId: String,
        publicKey: String,
    ): Boolean {
        registerPasskeyTopLevel(credentialId, publicKey)
        return true
    }

    suspend fun generatePasskeyChallenge(): String {
        val responseJson = callFirebaseFunction(FirebaseRoutes.GENERATE_PASSKEY_CHALLENGE, "{}")
        val response = json.parseToJsonElement(responseJson).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["challenge"]?.jsonPrimitive?.content ?: ""
    }

    suspend fun verifyPasskeyRegistration(
        responseJson: String,
        challenge: String,
    ): Boolean {
        val payload =
            buildJsonObject {
                put("responseJson", responseJson)
                put("challenge", challenge)
            }
        val responseStr = callFirebaseFunction(FirebaseRoutes.VERIFY_PASSKEY_REGISTRATION, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["success"]?.jsonPrimitive?.boolean ?: false
    }

    suspend fun executeBiometricPurchase(
        orderId: String,
        responseJson: String,
        challenge: String,
    ): Boolean {
        val payload =
            buildJsonObject {
                put("orderId", orderId)
                put("responseJson", responseJson)
                put("challenge", challenge)
            }
        val responseStr = callFirebaseFunction("executeBiometricPurchase", payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["success"]?.jsonPrimitive?.boolean ?: false
    }

    suspend fun generateGoogleWalletPassJwt(passType: String = "loyalty"): String {
        val payload = buildJsonObject { put("passType", passType) }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_GOOGLE_WALLET_PASS_JWT, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["jwt"]?.jsonPrimitive?.content ?: ""
    }

    suspend fun getWeatherContext(): String =
        try {
            val response: String =
                client
                    .get(
                        "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true",
                    ).bodyAsText()
            val json = Json { ignoreUnknownKeys = true }.parseToJsonElement(response).jsonObject
            val current = json["current_weather"]?.jsonObject
            val temp =
                current
                    ?.get("temperature")
                    ?.jsonPrimitive
                    ?.content
                    ?.toDoubleOrNull() ?: 20.0
            when {
                temp < 10.0 -> "Winter"
                temp > 25.0 -> "Summer"
                else -> "Occasion"
            }
        } catch (e: Exception) {
            "Occasion"
        }

    suspend fun fetchProduct(productId: String): ProductItem {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.FETCH_PRODUCTS_BY_IDS, buildJsonObject { put("ids", buildJsonArray { add(productId) }) }.toString())).jsonObject
        val item = (response["result"]?.jsonObject ?: response)["products"]?.jsonArray?.firstOrNull()
            ?: throw Exception("Product listing not found")
        return json.decodeFromJsonElement(item)
    }

    suspend fun fetchDetection(detectionId: String): DetectedItem {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_VISION_DETECTION, buildJsonObject { put("detectionId", detectionId) }.toString())).jsonObject
        val item = (response["result"]?.jsonObject ?: response)["detection"] ?: throw Exception("Vision detection not found")
        return json.decodeFromJsonElement(item)
    }

    suspend fun fetchRecipe(recipeName: String): network.models.GroceryItem {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_SAVED_RECIPE, buildJsonObject { put("recipeId", recipeName) }.toString())).jsonObject
        val item = (response["result"]?.jsonObject ?: response)["recipe"] ?: throw Exception("Recipe not found")
        return json.decodeFromJsonElement(item)
    }

    suspend fun fetchOrders(): List<network.models.OrderRecord> {
        val response = json.parseToJsonElement(callFirebaseFunction(FirebaseRoutes.GET_USER_ORDERS, "{}")).jsonObject
        val items = (response["result"]?.jsonObject ?: response)["orders"]?.jsonArray ?: return emptyList()
        return items.mapNotNull { runCatching { json.decodeFromJsonElement<network.models.OrderRecord>(it) }.getOrNull() }
    }
}
