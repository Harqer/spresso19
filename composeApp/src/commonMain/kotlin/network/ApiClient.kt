package network

import components.models.TripRecord
import components.features.catalog.DiscoveredListing
import components.features.catalog.parseDiscoveredListingsCallableResponse
import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.plugin
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import io.ktor.utils.io.readUTF8Line
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
import kotlin.time.TimeSource
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import network.models.ChatStreamChunk
import network.models.UserProfileData
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import network.addGroceryItem as addGroceryItemTopLevel
import network.createPaymentMethod as createPaymentMethodTopLevel
import network.deleteGroceryItem as deleteGroceryItemTopLevel
import network.deletePaymentMethod as deletePaymentMethodTopLevel

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
    val merchantUrl: String? = null,
    val source: String? = null,
    val providerListingId: String? = null,
)

@Serializable
data class GeneratedOutfit(
    val title: String? = null,
    @SerialName("stylingAdvice") val stylingAdvice: String? = null,
    @SerialName("selectedItemIds") val selectedItemIds: List<String> = emptyList(),
    @SerialName("weatherMatchScore") val weatherMatchScore: Double? = null,
    @SerialName("styleTips") val styleTips: List<String> = emptyList(),
)

@Serializable
data class LensSearchResponse(
    val success: Boolean,
    val listings: List<DiscoveredListing> = emptyList(),
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
    val client: HttpClient
        get() = sharedClient

    private val json = Json { ignoreUnknownKeys = true }

    private fun JsonObject.string(key: String): String = this[key]?.jsonPrimitive?.content ?: ""
    private fun JsonObject.double(key: String): Double = this[key]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
    private fun JsonObject.jsonArray(key: String) = this[key]?.jsonArray ?: emptyList<kotlinx.serialization.json.JsonElement>()

    suspend fun discoverPersonalizedProducts(): List<ProductItem> {
        discoverCache?.let { cached ->
            if (cached.mark.elapsedNow().inWholeMilliseconds < DISCOVER_CACHE_TTL_MS) {
                return cached.value
            }
        }
        val responseStr = callFirebaseFunction(FirebaseRoutes.DISCOVER_PERSONALIZED_PRODUCTS, "{}")
        val products =
            parseDiscoveredListingsCallableResponse(responseStr).map { listing ->
                ProductItem(
                    id = listing.id,
                    name = listing.name,
                    brand = listing.brand.orEmpty(),
                    category = listing.category.orEmpty(),
                    price = listing.observedPrice?.amount,
                    imageUrl = listing.imageUrl.orEmpty(),
                    merchantUrl = listing.merchantUrl,
                    source = listing.source,
                    providerListingId = listing.providerListingId,
                )
            }
        discoverCache = DiscoverCache(TimeSource.Monotonic.markNow(), products)
        return products
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
    /** Firebase Hosting is the canonical HTTP boundary for non-callable REST resources. */
    private val backendBaseUrl = SpressoConfig.backendBaseUrl

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
            val url = "$cloudFunctionsBaseUrl/${FirebaseRoutes.CHAT_STREAM}"

            try {
                val response =
                    client.post(url) {
                        contentType(ContentType.Application.Json)
                        if (authToken != null) {
                            header(HttpHeaders.Authorization, "Bearer $authToken")
                        }
                        val localeHelper = com.spresso.translation.LocaleHelper()
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

                if (response.status.value !in 200..299) {
                    throw Exception("Chat request failed with HTTP ${response.status.value}")
                }
                val channel = response.bodyAsChannel()
                var completed = false
                while (!channel.isClosedForRead) {
                    val line = channel.readUTF8Line() ?: break
                    if (!line.startsWith("data: ")) continue
                    val data = line.removePrefix("data: ")
                    if (data == "[DONE]") {
                        completed = true
                        emit(ChatStreamChunk(type = "done"))
                        break
                    }
                    runCatching { json.parseToJsonElement(data).jsonObject["text"]?.jsonPrimitive?.content }
                        .getOrNull()
                        ?.let { emit(ChatStreamChunk(type = "text", text = it)) }
                }
                if (!completed) {
                    emit(ChatStreamChunk(type = "done"))
                }
            } catch (e: Exception) {
                emit(ChatStreamChunk(type = "text", text = "I couldn't complete that request. Please try again."))
                emit(ChatStreamChunk(type = "done"))
            }
        }

    open suspend fun performLensSearch(base64Image: String): LensSearchResponse =
        try {
            val payload = buildJsonObject { put("imageBase64", base64Image) }
            val responseStr = callFirebaseFunction(FirebaseRoutes.LENS_SEARCH, payload.toString())
            val response = json.parseToJsonElement(responseStr).jsonObject
            val result = response["result"]?.jsonObject ?: response
            json.decodeFromJsonElement<LensSearchResponse>(result)
        } catch (e: Exception) {
            throw Exception("Failed to perform Spresso Lens Search: \${e.message}", e)
        }

    suspend fun performAccessibilityLensSearch(base64Image: String): LensSearchResponse = performLensSearch(base64Image)

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
        val response = client.get("$backendBaseUrl/travel/trips/$tripId/events").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchTravelExpenses(tripId: String): List<components.models.TravelExpense> {
        val response = client.get("$backendBaseUrl/travel/trips/$tripId/expenses").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchVoiceNotes(tripId: String): List<components.models.VoiceNote> {
        val response = client.get("$backendBaseUrl/travel/trips/$tripId/voicenotes").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchGroceryList(listId: String): List<network.models.GroceryItem> {
        val response = client.get("$backendBaseUrl/grocery/lists/$listId/items").bodyAsText()
        return json.decodeFromString(response)
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
        val token = getCurrentUserIdToken() ?: throw Exception("User not authenticated")
        val functionsUrl =
            try {
                SpressoConfig.cloudFunctionsBaseUrl
            } catch (
                _: Exception,
            ) {
                "https://us-central1-get-spresso.cloudfunctions.net"
            }

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

    suspend fun generateGoogleWalletPassJwt(passType: String = "loyalty"): String {
        val payload = buildJsonObject { put("passType", passType) }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_GOOGLE_WALLET_PASS_JWT, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["jwt"]?.jsonPrimitive?.content ?: ""
    }

    suspend fun getWeatherContext(latLng: Pair<Double, Double>): String =
        try {
            val temp = fetchCelsius(latLng)
            when {
                temp < 10.0 -> "Winter"
                temp > 25.0 -> "Summer"
                else -> "Occasion"
            }
        } catch (e: Exception) {
            throw IllegalStateException("Weather data unavailable", e)
        }

    suspend fun getTemperatureText(latLng: Pair<Double, Double>): String =
        try {
            "${fetchCelsius(latLng)}°C"
        } catch (e: Exception) {
            ""
        }

    private suspend fun fetchCelsius(latLng: Pair<Double, Double>): Double {
        val (latitude, longitude) = latLng
        val response: String =
            client
                .get(
                    "https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude&current_weather=true",
                ).bodyAsText()
        val parsed = json.parseToJsonElement(response).jsonObject
        val current = parsed["current_weather"]?.jsonObject
        return current
            ?.get("temperature")
            ?.jsonPrimitive
            ?.content
            ?.toDoubleOrNull() ?: throw IllegalStateException("Weather data unavailable")
    }

    suspend fun fetchProduct(productId: String): ProductItem {
        val response = client.get("$backendBaseUrl/products/$productId").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchDetection(detectionId: String): DetectedItem {
        val response = client.get("$backendBaseUrl/vision/detections/$detectionId").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchRecipe(recipeName: String): network.models.GroceryItem {
        val response = client.get("$backendBaseUrl/recipes/$recipeName").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchOrders(): List<network.models.OrderRecord> {
        val response = client.get("$backendBaseUrl/orders/history").bodyAsText()
        return json.decodeFromString(response)
    }

    suspend fun fetchLikedProductIds(): List<String> {
        val payload = buildJsonObject { }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GET_USER_PREFERENCES, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        val likedIds = result["likedIds"]?.jsonArray ?: return emptyList()
        return likedIds.mapNotNull { it.jsonPrimitive.content }
    }

    suspend fun fetchProductsByIds(productIds: List<String>): List<ProductItem> {
        if (productIds.isEmpty()) return emptyList()
        val payload = buildJsonObject {
            put("productIds", buildJsonArray {
                productIds.forEach { add(it) }
            })
        }
        val responseStr = callFirebaseFunction(FirebaseRoutes.FETCH_PRODUCTS_BY_IDS, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        val listings = result["listings"]?.jsonArray ?: return emptyList()
        return listings.mapNotNull { element ->
            try {
                json.decodeFromJsonElement<ProductItem>(element.jsonObject)
            } catch (e: Exception) {
                null
            }
        }
    }

    suspend fun fetchFavorites(): List<ProductItem> {
        val likedIds = fetchLikedProductIds()
        return fetchProductsByIds(likedIds)
    }

    suspend fun generateOutfit(
        items: List<WardrobeItemData>,
        weatherCondition: String,
        temperatureText: String,
        userLocation: String? = null,
    ): GeneratedOutfit? {
        if (items.isEmpty()) return null
        val payload = buildJsonObject {
            put(
                "items",
                buildJsonArray {
                    items.forEach { item ->
                        add(
                            buildJsonObject {
                                put("id", item.id)
                                put("name", item.brand?.takeIf { it.isNotBlank() } ?: item.category)
                                put("category", item.category)
                                item.color?.let { put("color", it) }
                            },
                        )
                    }
                },
            )
            put("weatherCondition", weatherCondition)
            put("temperatureText", temperatureText)
            userLocation?.let { put("userLocation", it) }
        }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GENERATE_OUTFIT, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return runCatching {
            json.decodeFromJsonElement<GeneratedOutfit>(result)
        }.getOrNull()
    }

    suspend fun getUserPreferences(): Map<String, Any?> {
        val payload = buildJsonObject { }
        val responseStr = callFirebaseFunction(FirebaseRoutes.GET_USER_PREFERENCES, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return mapOf(
            "likedIds" to result["likedIds"]?.jsonArray?.map { it.jsonPrimitive.content },
            "bookmarkedIds" to result["bookmarkedIds"]?.jsonArray?.map { it.jsonPrimitive.content },
        )
    }

    suspend fun updateUserPreferences(
        fitPreference: String? = null,
        height: String? = null,
        weight: String? = null,
        vibes: List<String>? = null,
    ): Boolean {
        val payload = buildJsonObject {
            fitPreference?.let { put("fitPreference", it) }
            height?.let { put("height", it) }
            weight?.let { put("weight", it) }
            vibes?.let { list ->
                put("vibes", buildJsonArray {
                    list.forEach { add(it) }
                })
            }
        }
        val responseStr = callFirebaseFunction(FirebaseRoutes.UPDATE_USER_PREFERENCES, payload.toString())
        val response = json.parseToJsonElement(responseStr).jsonObject
        val result = response["result"]?.jsonObject ?: response
        return result["success"]?.jsonPrimitive?.boolean == true
    }

    companion object {
        private val sharedClient: HttpClient by lazy {
            val client = HttpClient {
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
            client.plugin(HttpSend).intercept { request ->
                val appCheckToken = getCurrentAppCheckToken()
                if (!appCheckToken.isNullOrBlank()) {
                    request.headers.append("X-Firebase-AppCheck", appCheckToken)
                }
                execute(request)
            }
            client
        }
        private var discoverCache: DiscoverCache? = null
        private const val DISCOVER_CACHE_TTL_MS = 5 * 60 * 1000L
        private data class DiscoverCache(val mark: kotlin.time.TimeMark, val value: List<ProductItem>)
    }
}
