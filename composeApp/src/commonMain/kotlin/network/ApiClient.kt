package network

import components.features.catalog.DiscoveredListing
import components.models.ItineraryEvent
import components.models.TravelExpense
import components.models.TripRecord
import components.models.VoiceNote
import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.plugin
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.delay
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import network.models.PaymentCardInfo
import network.models.UserProfileData
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

data class TravelDetailData(
    val events: List<ItineraryEvent>,
    val expenses: List<TravelExpense>,
    val voiceNotes: List<VoiceNote>,
)

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

    /** Convex owns the application backend; Firebase remains identity-only. */
    private val convexApi by lazy { ConvexApi() }

    /**
     * Digital-credential verification is intentionally not exposed as a
     * backend sign-in bridge. Firebase Auth owns credentials and Convex only
     * accepts Firebase ID tokens, so a client cannot mint or exchange a custom
     * token through this app backend.
     */
    suspend fun verifyEmailCredential(
        credential: String,
        nonce: String,
    ): String? {
        require(credential.isNotBlank()) { "A digital credential is required." }
        require(nonce.isNotBlank()) { "A credential nonce is required." }
        error("Digital credential sign-in is not supported by the active Firebase identity flow.")
    }

    suspend fun recordInteraction(
        productId: String,
        action: String,
    ): Boolean {
        logCrashlyticsBreadcrumb(action, "productId=$productId")
        return convexApi.recordInteraction(productId, action)
    }

    open suspend fun streamTelemetry(event: VideoInteractionEvent): Boolean = convexApi.recordInteraction(event.itemId, "video_interaction")

    suspend fun requestVirtualTryOn(base64Image: String): String {
        require(base64Image.isNotBlank()) { "A captured image is required." }
        error("Select a garment listing before starting virtual try-on.")
    }

    suspend fun requestSpin360(productId: String): String {
        val product =
            convexApi.fetchProductById(productId)
                ?: error("External listing not found.")
        return product.imageUrl.takeIf { it.startsWith("https://") }
            ?: error("This listing has no verified media preview.")
    }

    suspend fun createChatThread(title: String? = null): String = convexApi.createChatThread(title)

    suspend fun sendChatMessage(
        threadId: String,
        prompt: String,
    ) = convexApi.sendChatMessage(threadId, prompt)

    suspend fun listChatMessages(threadId: String): List<ConvexChatMessage> = convexApi.listChatMessages(threadId)

    @OptIn(ExperimentalEncodingApi::class)
    open suspend fun performLensSearch(base64Image: String): LensSearchResponse {
        val normalized = base64Image.substringAfter(",", base64Image)
        val bytes =
            runCatching { Base64.decode(normalized) }
                .getOrElse { throw IllegalArgumentException("A valid captured image is required.", it) }
        if (bytes.isEmpty()) throw IllegalArgumentException("A captured image is required.")
        val uploaded = convexApi.uploadMedia(bytes, inferImageMimeType(bytes))
        val result = convexApi.searchVision(uploaded.mediaKey)
        return LensSearchResponse(success = true, listings = result.listings)
    }

    suspend fun performAccessibilityLensSearch(base64Image: String): LensSearchResponse = performLensSearch(base64Image)

    suspend fun requestOrderReturn(
        orderId: String,
        reason: String,
    ): JsonObject {
        val success = convexApi.requestOrderReturn(orderId, reason)
        return buildJsonObject { put("success", success) }
    }

    suspend fun setOrderReminder(
        orderId: String,
        reminderTime: String,
    ): JsonObject {
        val success = convexApi.setOrderReminder(orderId, reminderTime)
        return buildJsonObject { put("success", success) }
    }

    suspend fun generateCreatorCampaign(
        prompt: String,
        templateId: String,
    ): JsonObject =
        convexApi.generateCreatorCampaign(
            productName = templateId,
            campaignGoal = prompt,
        )

    suspend fun generateRecipeBargainChef(
        prompt: String,
        ingredients: List<String> = emptyList(),
    ): JsonObject {
        val threadId = convexApi.createChatThread("Bargain Chef")
        val fullPrompt =
            buildString {
                append(prompt.trim())
                if (ingredients.isNotEmpty()) append(" Ingredients: ${ingredients.joinToString()}.")
            }
        convexApi.sendChatMessage(threadId, fullPrompt)
        repeat(20) {
            delay(500)
            val response =
                convexApi
                    .listChatMessages(threadId)
                    .lastOrNull { it.role == "assistant" && it.text.isNotBlank() }
            if (response != null) return buildJsonObject { put("text", response.text) }
        }
        error("Recipe guidance is still processing. Please try again shortly.")
    }

    suspend fun fetchUserProfile(uid: String): UserProfileData {
        var result = convexApi.fetchCurrentUser()
        if (result == null) {
            convexApi.bootstrapCurrentUser(null, null)
            result = convexApi.fetchCurrentUser()
        }
        result = result ?: error("Authenticated profile was not found.")
        val savedCards =
            runCatching { convexApi.fetchPaymentMethods() }.getOrDefault(emptyList()).mapNotNull { card ->
                val id = card["_id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                PaymentCardInfo(
                    id = id,
                    brand = card["brand"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                    last4 = card["last4"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                    expiryMonth = card["expMonth"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 0,
                    expiryYear = card["expYear"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 0,
                    isDefault = card["isDefault"]?.jsonPrimitive?.contentOrNull?.toBooleanStrictOrNull() ?: false,
                )
            }
        return UserProfileData(
            uid = result["firebaseUid"]?.jsonPrimitive?.contentOrNull ?: uid,
            name = result["displayName"]?.jsonPrimitive?.contentOrNull.orEmpty(),
            email = result["email"]?.jsonPrimitive?.contentOrNull.orEmpty(),
            avatarUrl = result["photoUrl"]?.jsonPrimitive?.contentOrNull,
            savedCards = savedCards,
            web3WalletAddress = result["coinbaseWalletAddress"]?.jsonPrimitive?.contentOrNull,
        )
    }

    suspend fun updateUserProfile(profile: UserProfileData): Boolean {
        convexApi.updateCurrentUserProfile(profile.name, profile.avatarUrl)
        convexApi.setPreferences(
            pushNotifications = profile.notificationsEnabled,
            vibes = profile.explicitInterests,
        )
        return true
    }

    suspend fun deactivateAccount(): Boolean {
        val operationId = convexApi.requestAccountDeletion()
        return try {
            convexApi.waitForAccountDeletion(operationId)
            deleteCurrentUserIdentity()
        } catch (error: Exception) {
            throw IllegalStateException(
                "Your account data is still being removed. Keep this session signed in and try again shortly.",
                error,
            )
        }
    }

    suspend fun fetchTravelTrips(): List<TripRecord> =
        convexApi.fetchTrips().map { trip ->
            TripRecord(
                id = trip.id,
                title = trip.title,
                destination = trip.destination,
                startDate = trip.startDate,
                endDate = trip.endDate,
                status = trip.status,
                coverImage = trip.coverImage.orEmpty(),
                budgetTotal = trip.budgetTotal ?: 0.0,
                spentTotal = 0.0,
            )
        }

    suspend fun fetchTravelDetail(tripId: String): TravelDetailData {
        val detail = convexApi.fetchTripDetail(tripId)
        return TravelDetailData(
            events =
                detail
                    ?.events
                    ?.map { event ->
                        ItineraryEvent(
                            id = event.id,
                            tripId = tripId,
                            type = event.type,
                            title = event.title,
                            description = event.description,
                            eventTime = event.eventTime,
                            location = event.location,
                            price = event.price,
                            qrData = event.qrData,
                            confirmationCode = event.confirmationCode,
                            gate = event.gate,
                            seat = event.seat,
                        )
                    }.orEmpty(),
            expenses =
                detail
                    ?.expenses
                    ?.map { expense ->
                        TravelExpense(
                            expense.id,
                            tripId,
                            expense.amount,
                            expense.currency,
                            expense.category,
                            expense.merchant,
                            expense.date,
                        )
                    }.orEmpty(),
            voiceNotes =
                detail
                    ?.voiceNotes
                    ?.map { note ->
                        VoiceNote(note.id, tripId, note.transcript, note.createdAt.toString())
                    }.orEmpty(),
        )
    }

    suspend fun fetchTravelEvents(tripId: String): List<ItineraryEvent> = fetchTravelDetail(tripId).events

    suspend fun fetchTravelExpenses(tripId: String): List<TravelExpense> = fetchTravelDetail(tripId).expenses

    suspend fun fetchVoiceNotes(tripId: String): List<VoiceNote> = fetchTravelDetail(tripId).voiceNotes

    @Suppress("UNUSED_PARAMETER")
    suspend fun fetchGroceryList(listId: String): List<network.models.GroceryItem> =
        convexApi.fetchGroceryItems().map { item ->
            network.models.GroceryItem(
                id = item.id,
                name = item.name,
                quantity = 1,
                unit = "item",
                category = item.category,
                estimatedPrice = 0.0,
                checked = item.checked,
            )
        }

    suspend fun initializeOnboarding(interests: List<String>) {
        convexApi.setPreferences(searchInquiries = interests, onboardingCompleted = true)
    }

    suspend fun connectCoinbaseWallet(address: String): Boolean {
        require(Regex("^0x[a-fA-F0-9]{40}$").matches(address)) { "A valid Base wallet address is required." }
        return convexApi.connectCoinbaseWallet(address)
    }

    fun close() {
        client.close()
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun addGroceryItem(
        listId: String,
        productName: String,
        productId: String?,
        addedVia: String,
    ): Boolean = convexApi.addGroceryItem(productName, addedVia)

    suspend fun toggleGroceryItem(
        id: String,
        isPurchased: Boolean,
    ): Boolean = convexApi.setGroceryChecked(id, isPurchased)

    suspend fun deleteGroceryItem(id: String): Boolean = convexApi.removeGroceryItem(id)

    suspend fun removePaymentMethod(id: String): Boolean = convexApi.detachPaymentMethod(id)

    @Suppress("UNUSED_PARAMETER")
    suspend fun generateResponseFromAudio(
        prompt: String,
        audioData: ByteArray,
        mimeType: String = "audio/mp3",
    ): String {
        require(prompt.isNotBlank()) { "An audio prompt is required." }
        require(audioData.isNotEmpty()) { "Audio data is required." }
        require(mimeType.startsWith("audio/")) { "A valid audio MIME type is required." }
        error("Standard audio analysis is not available through the active Convex Agent flow; use live voice mode instead.")
    }

    suspend fun createPaymentMethod(stripePaymentMethodId: String): Boolean {
        convexApi.attachPaymentMethod(stripePaymentMethodId)
        return true
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
            ?.toDoubleOrNull() ?: error("Weather data unavailable")
    }

    suspend fun fetchDetection(detectionId: String): DetectedItem {
        require(detectionId.isNotBlank()) { "A detection identifier is required." }
        error("Detection details are returned with the active visual-search result; no legacy detection endpoint is configured.")
    }

    suspend fun fetchRecipe(recipeName: String): network.models.GroceryItem {
        require(recipeName.isNotBlank()) { "A recipe name is required." }
        error("Recipe ingredients are returned by the Convex Agent conversation; no legacy recipe endpoint is configured.")
    }

    suspend fun generateOutfit(
        items: List<WardrobeItemData>,
        weatherCondition: String,
        temperatureText: String,
    ): GeneratedOutfit? {
        if (items.isEmpty()) return null
        val normalizedWeather =
            when (weatherCondition.trim().uppercase()) {
                "WINTER" -> "WINTER_COLD"
                "SUMMER" -> "SUMMER_HEAT"
                "OCCASION" -> "ALL_WEATHER"
                else -> weatherCondition.trim().uppercase().replace(" ", "_")
            }
        val idempotencyKey = "wardrobe-outfit-${items.joinToString("-") { it.id }}-$normalizedWeather-$temperatureText"
        return convexApi.generateWardrobeOutfit(
            idempotencyKey = idempotencyKey,
            items = items,
            weatherCondition = normalizedWeather,
            temperatureText = temperatureText,
        )
    }

    suspend fun getUserPreferences(): Map<String, Any?> {
        val result = convexApi.fetchPreferences() ?: return emptyMap()
        val avatarProfile = result["avatarProfile"]?.jsonObject
        return mapOf(
            "likedIds" to result["vibes"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull },
            "bookmarkedIds" to result["searchInquiries"]?.jsonArray?.mapNotNull { it.jsonPrimitive.contentOrNull },
            "fitPreference" to avatarProfile?.get("fitPreference")?.jsonPrimitive?.contentOrNull,
            "height" to avatarProfile?.get("height")?.jsonPrimitive?.contentOrNull,
            "weight" to avatarProfile?.get("weight")?.jsonPrimitive?.contentOrNull,
        )
    }

    suspend fun updateUserPreferences(
        fitPreference: String? = null,
        height: String? = null,
        weight: String? = null,
        vibes: List<String>? = null,
    ): Boolean {
        convexApi.setPreferences(
            fitPreference = fitPreference,
            height = height,
            weight = weight,
            vibes = vibes,
        )
        return true
    }

    companion object {
        private val sharedClient: HttpClient by lazy {
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
            client.plugin(HttpSend).intercept { request ->
                val appCheckToken = getCurrentAppCheckToken()
                if (!appCheckToken.isNullOrBlank()) {
                    request.headers.append("X-Firebase-AppCheck", appCheckToken)
                }
                execute(request)
            }
            client
        }
    }
}
