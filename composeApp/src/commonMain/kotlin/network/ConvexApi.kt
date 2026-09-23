package network

import components.features.catalog.DiscoveredListing
import components.features.catalog.ObservedPrice
import components.features.catalog.toProductItem
import components.models.ItineraryEvent
import components.models.TravelExpense
import components.models.TripRecord
import components.models.VoiceNote
import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.plugin
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.delay
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import network.models.GroceryItem
import network.models.OrderItem
import network.models.OrderRecord
import network.models.PaymentCardInfo
import network.models.UserProfileData
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * Server-verified merchant quote plus the exact-intent authorization
 * challenge. `message` is the canonical string the device must sign with its
 * registered checkout key; the server verifies the signature before allowing
 * any charge.
 */
@kotlinx.serialization.Serializable
data class CheckoutQuote(
    val attemptId: String,
    val amountCents: Long,
    val currency: String,
    val merchantUrl: String,
    val observedAt: String,
    val challenge: String = "",
    val message: String = "",
    val authorizationExpiresAt: Long = 0L,
)

/** Result of the off-session charge against the user's saved default card. */
@kotlinx.serialization.Serializable
data class CheckoutConfirmation(
    val status: String,
    val paymentIntentId: String,
    val amountCents: Long,
    val currency: String,
    val brand: String,
    val last4: String,
)

@kotlinx.serialization.Serializable
data class UploadedMediaReference(
    val assetId: String,
    val mediaKey: String,
    val mimeType: String,
    val byteLength: Int,
    val sha256: String,
)

@kotlinx.serialization.Serializable
data class ParsedTravelReceipt(
    val merchantName: String? = null,
    val purchaseDate: String? = null,
    val currency: String? = null,
    val total: Double? = null,
)

data class ConvexChatMessage(
    val id: String,
    val role: String,
    val text: String,
    val status: String,
    val products: List<ProductItem> = emptyList(),
)

/** Trip detail view model assembled from the Convex travel module. */
data class TravelDetailData(
    val events: List<ItineraryEvent>,
    val expenses: List<TravelExpense>,
    val voiceNotes: List<VoiceNote>,
)

/** Live merchant browser automation session state (Convex-owned, owner-scoped). */
@kotlinx.serialization.Serializable
data class MerchantBrowserSession(
    val sessionId: String,
    val merchantHost: String,
    val engine: String,
    val status: String,
    val currentStep: String? = null,
    val pageTitle: String? = null,
    val currentUrl: String? = null,
    val handoffReason: String? = null,
    val lastEventSeq: Long = 0L,
)

/** One customer-safe automation event from the session's append-only log. */
@kotlinx.serialization.Serializable
data class MerchantBrowserEvent(
    val eventId: String,
    val sequence: Long,
    val eventType: String,
    val summary: String,
    val createdAt: Long,
)

fun inferImageMimeType(bytes: ByteArray): String {
    val png = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47)
    val webp = byteArrayOf(0x52, 0x49, 0x46, 0x46)
    val webpMarker = byteArrayOf(0x57, 0x45, 0x42, 0x50)
    return when {
        bytes.startsWithAt(0, png) -> "image/png"
        bytes.startsWithAt(0, webp) && bytes.startsWithAt(8, webpMarker) -> "image/webp"
        else -> "image/jpeg"
    }
}

private fun WardrobeItemData.weatherSuitability(): String =
    when (category.trim().uppercase()) {
        "SUMMER_HEAT", "HOT_SUMMER" -> "HOT_SUMMER"
        "WINTER_COLD", "COLD_WINTER" -> "COLD_WINTER"
        "MILD_SPRING_AUTUMN" -> "MILD_SPRING_AUTUMN"
        else -> "ALL_WEATHER"
    }

private fun String.encodeURLParameter(): String =
    replace("%", "%25")
        .replace(" ", "%20")
        .replace("?", "%3F")
        .replace("&", "%26")
        .replace("#", "%23")

private fun ByteArray.startsWithAt(
    offset: Int,
    prefix: ByteArray,
): Boolean = offset >= 0 && offset + prefix.size <= size && prefix.indices.all { index -> this[offset + index] == prefix[index] }

private fun JsonObject.toWardrobeItemData(): WardrobeItemData? {
    val id = (this["_id"] ?: this["id"])?.jsonPrimitive?.contentOrNull ?: return null
    val image = (this["image"] ?: this["imageUrl"])?.jsonPrimitive?.contentOrNull ?: return null
    return WardrobeItemData(
        id = id,
        category = this["category"]?.jsonPrimitive?.contentOrNull.orEmpty(),
        brand = this["brand"]?.jsonPrimitive?.contentOrNull,
        imageUrl = image,
        color = this["color"]?.jsonPrimitive?.contentOrNull,
        kind = this["kind"]?.jsonPrimitive?.contentOrNull ?: "user_upload",
        productId = this["productId"]?.jsonPrimitive?.contentOrNull,
        mediaAssetId = this["mediaAssetId"]?.jsonPrimitive?.contentOrNull,
        mediaKey = this["mediaKey"]?.jsonPrimitive?.contentOrNull,
    )
}

/**
 * Convex transport for the KMP clients.
 *
 * Spresso is not a retailer: there is no product inventory in the backend.
 * Discovery runs through Convex actions that orchestrate external store/search
 * providers; only user-scoped state (saved listings, cart snapshots, orders
 * for tracking/history) is persisted. This class speaks to the typed HTTP
 * bridge in `convex/http.ts` at the deployment's `.convex.site` origin using
 * the caller's Firebase ID token, which Convex verifies against
 * `auth.config.ts` before any domain function runs.
 */
class ConvexApi(
    private val idTokenProvider: suspend () -> String? = { getCurrentUserIdToken() },
) {
    /** Exposed for image loading composites that share the app-wide client. */
    val client: HttpClient
        get() = sharedClient
    private val json = Json { ignoreUnknownKeys = true }
    private val baseUrl: String get() = SpressoConfig.convexSiteUrl

    private suspend fun get(path: String): String {
        val response = client.get("$baseUrl$path") { attachAuth() }
        return response.requireBody()
    }

    private suspend fun post(
        path: String,
        body: JsonObject,
    ): String {
        val response =
            client.post("$baseUrl$path") {
                contentType(ContentType.Application.Json)
                attachAuth()
                setBody(body.toString())
            }
        return response.requireBody()
    }

    suspend fun fetchCurrentUser(): JsonObject? {
        val body = get("/api/account/me")
        if (body == "null") return null
        return json.parseToJsonElement(body).jsonObject
    }

    /** Poll the owner's active merchant browser session (or null). */
    suspend fun fetchMerchantSession(): MerchantBrowserSession? {
        val body = get("/api/merchant/session")
        if (body.isEmpty() || body == "null") return null
        return json.decodeFromString<MerchantBrowserSession>(body)
    }

    /** Fetch customer-safe automation events after [afterSeq] (newest last). */
    suspend fun fetchMerchantSessionEvents(
        sessionId: String,
        afterSeq: Long,
    ): List<MerchantBrowserEvent> {
        val body = get("/api/merchant/session/events?sessionId=${sessionId.encodeURLParameter()}&afterSeq=$afterSeq")
        if (body.isEmpty() || body == "null") return emptyList()
        return json.decodeFromString<List<MerchantBrowserEvent>>(body)
    }

    /** Pause / take over / resume / complete the owner's session. */
    suspend fun controlMerchantSession(
        sessionId: String,
        control: String,
    ): Boolean {
        val body =
            post(
                "/api/merchant/session/control",
                buildJsonObject {
                    put("sessionId", sessionId)
                    put("control", control)
                },
            )
        return json
            .parseToJsonElement(body)
            .jsonObject["ok"]
            ?.jsonPrimitive
            ?.booleanOrNull == true
    }

    /** Begin a merchant automation session on an allow-listed merchant URL. */
    suspend fun beginMerchantSession(merchantUrl: String): String {
        val body =
            post(
                "/api/merchant/session/begin",
                buildJsonObject { put("merchantUrl", merchantUrl) },
            )
        return json
            .parseToJsonElement(body)
            .jsonObject["sessionId"]
            ?.jsonPrimitive
            ?.content
            ?: error("Merchant session did not return an id.")
    }

    suspend fun fetchPaymentMethods(): List<JsonObject> {
        val response = json.parseToJsonElement(get("/api/payment-methods")).jsonObject
        return response["paymentMethods"]?.jsonArray?.map { it.jsonObject }.orEmpty()
    }

    suspend fun attachPaymentMethod(stripePaymentMethodId: String): JsonObject {
        require(stripePaymentMethodId.matches(Regex("^pm_[A-Za-z0-9]{8,}$"))) { "A valid Stripe PaymentMethod ID is required." }
        return json
            .parseToJsonElement(
                post("/api/payment-methods/attach", buildJsonObject { put("stripePaymentMethodId", stripePaymentMethodId) }),
            ).jsonObject
    }

    suspend fun detachPaymentMethod(recordId: String): Boolean {
        val response =
            json
                .parseToJsonElement(
                    post("/api/payment-methods/detach", buildJsonObject { put("recordId", recordId) }),
                ).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun connectCoinbaseWallet(address: String): Boolean {
        val response =
            json
                .parseToJsonElement(
                    post(
                        "/api/account/wallet/coinbase",
                        buildJsonObject {
                            put("address", address)
                            put("network", "base")
                        },
                    ),
                ).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun generateCreatorCampaign(
        productName: String,
        campaignGoal: String,
        targetAudience: String? = null,
    ): JsonObject {
        val response =
            json
                .parseToJsonElement(
                    post(
                        "/api/creator/campaign",
                        buildJsonObject {
                            put("productName", productName)
                            put("campaignGoal", campaignGoal)
                            if (!targetAudience.isNullOrBlank()) put("targetAudience", targetAudience)
                        },
                    ),
                ).jsonObject
        return response["campaign"]?.jsonObject ?: response
    }

    suspend fun updateCurrentUserProfile(
        displayName: String,
        photoUrl: String?,
    ): Boolean {
        post(
            "/api/account/profile",
            buildJsonObject {
                put("displayName", displayName)
                if (!photoUrl.isNullOrBlank()) put("photoUrl", photoUrl)
            },
        )
        return true
    }

    suspend fun bootstrapCurrentUser(
        email: String?,
        displayName: String?,
    ): String {
        val response =
            json
                .parseToJsonElement(
                    post(
                        "/api/account/bootstrap",
                        buildJsonObject {
                            if (!email.isNullOrBlank()) put("email", email)
                            if (!displayName.isNullOrBlank()) put("displayName", displayName)
                        },
                    ),
                ).jsonObject
        return response["userId"]?.jsonPrimitive?.content ?: error("Account bootstrap returned no user id.")
    }

    suspend fun requestAccountDeletion(): String {
        val response = json.parseToJsonElement(post("/api/account/delete", buildJsonObject { })).jsonObject
        return response["operationId"]?.jsonPrimitive?.content ?: error("Account deletion was not queued.")
    }

    suspend fun waitForAccountDeletion(
        operationId: String,
        maxAttempts: Int = 40,
        intervalMillis: Long = 500,
    ): String {
        require(operationId.isNotBlank()) { "Account deletion operation is required." }
        require(maxAttempts in 1..120) { "Account deletion polling limit is invalid." }
        require(intervalMillis in 100..5_000) { "Account deletion polling interval is invalid." }
        repeat(maxAttempts) { attempt ->
            val response = json.parseToJsonElement(get("/api/account/delete")).jsonObject
            val currentId = response["_id"]?.jsonPrimitive?.contentOrNull
            val status = response["status"]?.jsonPrimitive?.contentOrNull
            if (currentId == operationId && status == "COMPLETED") return status
            if (currentId == operationId && status == "FAILED") {
                val detail = response["lastError"]?.jsonPrimitive?.contentOrNull.orEmpty()
                error(detail.ifBlank { "Account deletion failed." })
            }
            if (attempt < maxAttempts - 1) delay(intervalMillis)
        }
        error("Account deletion is still processing. Identity was not removed; try again later.")
    }

    suspend fun fetchPreferences(): JsonObject? {
        val body = get("/api/account/preferences")
        if (body == "null") return null
        return json.parseToJsonElement(body).jsonObject
    }

    suspend fun setPreferences(
        onboardingCompleted: Boolean? = null,
        pushNotifications: Boolean? = null,
        fitPreference: String? = null,
        height: String? = null,
        weight: String? = null,
        searchInquiries: List<String>? = null,
        vibes: List<String>? = null,
    ) {
        post(
            "/api/account/preferences",
            buildJsonObject {
                onboardingCompleted?.let { put("onboardingCompleted", it) }
                pushNotifications?.let { put("pushNotifications", it) }
                fitPreference?.let { put("fitPreference", it) }
                height?.let { put("height", it) }
                weight?.let { put("weight", it) }
                searchInquiries?.let {
                    put(
                        "searchInquiries",
                        kotlinx.serialization.json.buildJsonArray {
                            it.forEach { value ->
                                add(kotlinx.serialization.json.JsonPrimitive(value))
                            }
                        },
                    )
                }
                vibes?.let {
                    put(
                        "vibes",
                        kotlinx.serialization.json.buildJsonArray {
                            it.forEach { value ->
                                add(kotlinx.serialization.json.JsonPrimitive(value))
                            }
                        },
                    )
                }
            },
        )
    }

    @OptIn(ExperimentalEncodingApi::class)
    suspend fun createChatThread(title: String? = null): String {
        val response =
            json
                .parseToJsonElement(
                    post(
                        "/api/chat/thread",
                        buildJsonObject {
                            if (!title.isNullOrBlank()) put("title", title)
                        },
                    ),
                ).jsonObject
        return response["threadId"]?.jsonPrimitive?.content ?: error("Chat thread was not created.")
    }

    suspend fun sendChatMessage(
        threadId: String,
        prompt: String,
    ) {
        post(
            "/api/chat/message",
            buildJsonObject {
                put("threadId", threadId)
                put("prompt", prompt)
            },
        )
    }

    suspend fun listChatMessages(threadId: String): List<ConvexChatMessage> {
        val response =
            json
                .parseToJsonElement(get("/api/chat/messages?threadId=${threadId.encodeURLParameter()}&limit=100"))
                .jsonObject
        val pageMessages =
            response["page"]
                ?.jsonArray
                ?.mapNotNull { element ->
                    val value = element.jsonObject
                    val id = value["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                    val role = value["role"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                    val products =
                        value["parts"]
                            ?.jsonArray
                            ?.flatMap { part ->
                                val output = part.jsonObject["output"]?.jsonObject ?: return@flatMap emptyList()
                                output["listings"]
                                    ?.jsonArray
                                    ?.mapNotNull { listing ->
                                        runCatching {
                                            json.decodeFromString<DiscoveredListing>(listing.toString()).toProductItem()
                                        }.getOrNull()
                                    }.orEmpty()
                            }.orEmpty()
                    ConvexChatMessage(
                        id = id,
                        role = role,
                        text = value["text"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                        status = value["status"]?.jsonPrimitive?.contentOrNull ?: "success",
                        products = products,
                    )
                }.orEmpty()
        val streamMessages =
            response["streams"]
                ?.jsonObject
                ?.get("deltas")
                ?.jsonArray
                ?.mapNotNull { delta ->
                    val value = delta.jsonObject
                    val streamId = value["streamId"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                    val textValue =
                        value["parts"]
                            ?.jsonArray
                            ?.joinToString("") { part ->
                                val partValue = part.jsonObject
                                partValue["delta"]?.jsonPrimitive?.contentOrNull
                                    ?: partValue["text"]?.jsonPrimitive?.contentOrNull.orEmpty()
                            }.orEmpty()
                    ConvexChatMessage(id = streamId, role = "assistant", text = textValue, status = "streaming")
                }.orEmpty()
        return pageMessages + streamMessages
    }

    suspend fun generateWardrobeOutfit(
        idempotencyKey: String,
        items: List<WardrobeItemData>,
        weatherCondition: String,
        temperatureText: String,
    ): GeneratedOutfit? {
        val body =
            buildJsonObject {
                put("idempotencyKey", idempotencyKey)
                put("weatherCondition", weatherCondition)
                put("temperatureText", temperatureText)
                put(
                    "items",
                    kotlinx.serialization.json.buildJsonArray {
                        items.forEach { item ->
                            add(
                                buildJsonObject {
                                    put("id", item.id)
                                    put("name", item.brand?.takeIf { it.isNotBlank() } ?: item.category)
                                    put("category", item.category)
                                    put("weatherSuitability", item.weatherSuitability())
                                    put("image", item.imageUrl)
                                },
                            )
                        }
                    },
                )
            }
        val response = json.parseToJsonElement(post("/api/wardrobe/outfit", body)).jsonObject
        val outfit = response["outfit"]?.jsonObject ?: return null
        return GeneratedOutfit(
            title = outfit["title"]?.jsonPrimitive?.contentOrNull,
            stylingAdvice = outfit["stylingAdvice"]?.jsonPrimitive?.contentOrNull,
            selectedItemIds =
                outfit["items"]
                    ?.jsonArray
                    ?.mapNotNull { item ->
                        item.jsonObject["id"]?.jsonPrimitive?.contentOrNull
                    }.orEmpty(),
            weatherMatchScore = outfit["weatherMatchScore"]?.jsonPrimitive?.doubleOrNull,
            styleTips =
                outfit["styleTips"]
                    ?.jsonArray
                    ?.mapNotNull { it.jsonPrimitive.contentOrNull }
                    .orEmpty(),
        )
    }

    suspend fun uploadMedia(
        bytes: ByteArray,
        mimeType: String,
    ): UploadedMediaReference {
        val body =
            buildJsonObject {
                put("bytesBase64", Base64.encode(bytes))
                put("mimeType", mimeType)
            }
        val response = json.parseToJsonElement(post("/api/media/upload", body)).jsonObject
        return UploadedMediaReference(
            assetId = response["assetId"]?.jsonPrimitive?.content ?: error("Media upload returned no asset id."),
            mediaKey = response["mediaKey"]?.jsonPrimitive?.content ?: error("Media upload returned no media key."),
            mimeType = response["mimeType"]?.jsonPrimitive?.content ?: mimeType,
            byteLength = response["byteLength"]?.jsonPrimitive?.content?.toIntOrNull() ?: bytes.size,
            sha256 = response["sha256"]?.jsonPrimitive?.content ?: error("Media upload returned no digest."),
        )
    }

    suspend fun parseTravelReceipt(mediaKey: String): ParsedTravelReceipt {
        val response =
            json
                .parseToJsonElement(
                    post("/api/travel/receipt", buildJsonObject { put("receiptMediaKey", mediaKey) }),
                ).jsonObject
        return json.decodeFromString(response.toString())
    }

    suspend fun getMediaReadUrl(assetId: String): String {
        val response =
            json
                .parseToJsonElement(
                    post("/api/media/read-url", buildJsonObject { put("assetId", assetId) }),
                ).jsonObject
        return response["url"]?.jsonPrimitive?.content ?: error("Media read URL was not returned.")
    }

    suspend fun searchVision(mediaKey: String): LensSearchResponse {
        val body = buildJsonObject { put("imageMediaKey", mediaKey) }
        val response = json.parseToJsonElement(post("/api/vision/search", body)).jsonObject
        val listings =
            response["listings"]
                ?.jsonArray
                ?.mapNotNull { element ->
                    runCatching { json.decodeFromString<DiscoveredListing>(element.toString()) }.getOrNull()
                }.orEmpty()
        return LensSearchResponse(success = true, listings = listings)
    }

    suspend fun generateVirtualTryOn(
        bytes: ByteArray,
        garmentImageUrl: String,
        idempotencyKey: String,
    ): String {
        val uploaded = uploadMedia(bytes, inferImageMimeType(bytes))
        val body =
            buildJsonObject {
                put("mediaAssetId", uploaded.assetId)
                put("garmentImageUrl", garmentImageUrl)
                put("idempotencyKey", idempotencyKey)
            }
        val response = json.parseToJsonElement(post("/api/media/try-on", body)).jsonObject
        return response["mediaUrl"]?.jsonPrimitive?.content ?: error("Try-on did not return a media URL.")
    }

    private suspend fun HttpResponse.requireBody(): String {
        val body = bodyAsText()
        if (status.value !in 200..299) {
            val message =
                runCatching {
                    json
                        .parseToJsonElement(body)
                        .jsonObject["error"]
                        ?.jsonPrimitive
                        ?.content
                }.getOrNull()
            throw IllegalStateException(message ?: "Convex request failed (${status.value}).")
        }
        return body
    }

    private suspend fun io.ktor.client.request.HttpRequestBuilder.attachAuth() {
        val token = idTokenProvider()
        if (!token.isNullOrBlank()) header(HttpHeaders.Authorization, "Bearer $token")
    }

    // ---- Discovery: external-provider search + preference-derived feed ----

    suspend fun searchProducts(
        query: String,
        location: String? = null,
    ): List<ProductItem> {
        val body =
            buildJsonObject {
                put("query", query)
                if (!location.isNullOrBlank()) put("location", location)
            }
        val response = json.parseToJsonElement(post("/api/discovery/search", body)).jsonObject
        return response["listings"]?.jsonArray?.mapNotNull { element ->
            runCatching { json.decodeFromString<DiscoveredListing>(element.toString()).toProductItem() }.getOrNull()
        } ?: emptyList()
    }

    suspend fun fetchRecommendedProducts(): List<ProductItem> {
        val response = json.parseToJsonElement(post("/api/discovery/recommendations", buildJsonObject { })).jsonObject
        return response["listings"]?.jsonArray?.mapNotNull { element ->
            runCatching { json.decodeFromString<DiscoveredListing>(element.toString()).toProductItem() }.getOrNull()
        } ?: emptyList()
    }

    suspend fun recordInteraction(
        productId: String,
        action: String,
    ): Boolean {
        logCrashlyticsBreadcrumb(action, "productId=$productId")
        require(productId.isNotBlank()) { "Interaction subject is required." }
        require(action.isNotBlank()) { "Interaction action is required." }
        val response =
            json
                .parseToJsonElement(
                    post(
                        "/api/interactions",
                        buildJsonObject {
                            put("productId", productId)
                            put("action", action)
                        },
                    ),
                ).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    /** Lens-style visual search over a base64 capture; uploads through Convex media. */
    @OptIn(ExperimentalEncodingApi::class)
    suspend fun performLensSearch(base64Image: String): LensSearchResponse {
        val normalized = base64Image.substringAfter(",", base64Image)
        val bytes =
            runCatching { Base64.decode(normalized) }
                .getOrElse { throw IllegalArgumentException("A valid captured image is required.", it) }
        if (bytes.isEmpty()) throw IllegalArgumentException("A captured image is required.")
        val uploaded = uploadMedia(bytes, inferImageMimeType(bytes))
        return searchVision(uploaded.mediaKey)
    }

    suspend fun performAccessibilityLensSearch(base64Image: String): LensSearchResponse = performLensSearch(base64Image)

    suspend fun initializeOnboarding(interests: List<String>) {
        setPreferences(searchInquiries = interests, onboardingCompleted = true)
    }

    suspend fun removePaymentMethod(recordId: String): Boolean = detachPaymentMethod(recordId)

    suspend fun generateRecipeBargainChef(
        prompt: String,
        ingredients: List<String> = emptyList(),
    ): JsonObject {
        val threadId = createChatThread("Bargain Chef")
        val fullPrompt =
            buildString {
                append(prompt.trim())
                if (ingredients.isNotEmpty()) append(" Ingredients: ${ingredients.joinToString()}.")
            }
        sendChatMessage(threadId, fullPrompt)
        repeat(20) {
            delay(500)
            val response =
                listChatMessages(threadId)
                    .lastOrNull { it.role == "assistant" && it.text.isNotBlank() }
            if (response != null) return buildJsonObject { put("text", response.text) }
        }
        error("Recipe guidance is still processing. Please try again shortly.")
    }

    /** Media preview for a listing: verified HTTPS URL only, never a guess. */
    suspend fun requestSpin360(productId: String): String {
        val product =
            fetchProductById(productId)
                ?: error("External listing not found.")
        return product.imageUrl.takeIf { it.startsWith("https://") }
            ?: error("This listing has no verified media preview.")
    }

    /** Resolve a known external listing by asking providers; never queries local inventory. */
    suspend fun fetchProductById(productId: String): ProductItem? {
        require(productId.isNotBlank()) { "External listing id is required." }
        val products = searchProducts(productId)
        // Never substitute an unrelated search result for a requested listing.
        // A wrong garment can lead to an incorrect try-on or purchase flow.
        return products.firstOrNull { it.id == productId || it.providerListingId == productId }
    }

    // ---- Checkout: server-verified quote → biometric confirm → charge ----

    /**
     * Acquires (idempotently) a server-side checkout attempt for this listing.
     * The amount is never supplied here — the backend verifies the merchant's
     * current price through its own provider before anything can be charged.
     */
    suspend fun acquireCheckoutAttempt(
        product: ProductItem,
        quantity: Int = 1,
        idempotencyKey: String,
    ): String {
        require(quantity in 1..25) { "Checkout quantity must be between 1 and 25." }
        val merchantUrl = product.merchantUrl ?: throw IllegalArgumentException("A merchant URL is required for checkout.")
        val source = product.source ?: "parallel"
        require(source in setOf("parallel", "serpapi", "apify", "kitesurf")) { "Unsupported listing source." }
        val body =
            buildJsonObject {
                put("listingId", product.id)
                put(
                    "listing",
                    buildJsonObject {
                        put("id", product.id)
                        put("name", product.name)
                        if (product.brand.isNotBlank()) put("brand", product.brand)
                        if (product.category.isNotBlank()) put("category", product.category)
                        if (product.imageUrl.isNotBlank()) put("imageUrl", product.imageUrl)
                        put("merchantUrl", merchantUrl)
                        put("source", source)
                        if (product.providerListingId != null) put("providerListingId", product.providerListingId)
                        put(
                            "discoveredAt",
                            kotlin.time.Clock.System
                                .now()
                                .toString(),
                        )
                    },
                )
                put("quantity", quantity)
                put("idempotencyKey", idempotencyKey)
            }
        val response = json.parseToJsonElement(post("/api/checkout/attempt", body)).jsonObject
        return response["attemptId"]?.jsonPrimitive?.contentOrNull
            ?: throw IllegalStateException("Checkout attempt response did not include an attemptId.")
    }

    /** Asks the backend to re-verify the merchant's live price for this attempt. */
    suspend fun prepareCheckout(attemptId: String): CheckoutQuote =
        json.decodeFromString<CheckoutQuote>(post("/api/checkout/prepare", buildJsonObject { put("attemptId", attemptId) }))

    /**
     * Registers this device's checkout signing key with the backend. Requires
     * a fresh sign-in (the backend enforces Firebase auth_time freshness).
     */
    suspend fun registerCheckoutDevice(
        publicKey: String,
        label: String? = null,
    ): String {
        val body =
            buildJsonObject {
                put("publicKey", publicKey)
                if (label != null) put("label", label)
            }
        val response = json.parseToJsonElement(post("/api/checkout/devices", body)).jsonObject
        return response["deviceKeyId"]?.jsonPrimitive?.content
            ?: throw IllegalStateException("Device registration did not return a key id.")
    }

    /**
     * Submits the device signature over the exact-intent message. The server
     * verifies the ECDSA P-256 signature against the registered key and pins
     * the attempt into READY_FOR_PAYMENT.
     */
    suspend fun authorizeCheckout(
        attemptId: String,
        signature: String,
        publicKey: String,
    ): CheckoutConfirmation {
        val body =
            buildJsonObject {
                put("attemptId", attemptId)
                put("signature", signature)
                put("publicKey", publicKey)
            }
        val response = json.parseToJsonElement(post("/api/checkout/authorize", body)).jsonObject
        return CheckoutConfirmation(
            status = response["status"]?.jsonPrimitive?.content ?: "AUTHORIZED",
            paymentIntentId = "",
            amountCents = 0,
            currency = "",
            brand = "",
            last4 = "",
        )
    }

    /** Charges the user's saved default card off-session after server-verified device authorization. */
    suspend fun confirmCheckout(attemptId: String): CheckoutConfirmation =
        json.decodeFromString<CheckoutConfirmation>(post("/api/checkout/confirm", buildJsonObject { put("attemptId", attemptId) }))

    // ---- Saved listings: durable user bookmarks ---------------------------

    suspend fun fetchSavedListings(): List<SavedListingRecord> {
        val response = json.parseToJsonElement(get("/api/saved?limit=100")).jsonObject
        return response["items"]?.jsonArray?.mapNotNull { element ->
            runCatching { json.decodeFromString<SavedListingRecord>(element.toString()) }.getOrNull()
        } ?: emptyList()
    }

    suspend fun addCartItem(
        product: ProductItem,
        quantity: Int,
    ): Boolean {
        require(quantity in 1..25) { "Cart quantity must be between 1 and 25." }
        val merchantUrl = product.merchantUrl ?: throw IllegalArgumentException("A merchant URL is required to add a listing to the cart.")
        val source = product.source ?: "parallel"
        require(source in setOf("parallel", "serpapi", "apify", "kitesurf")) { "Unsupported listing source." }
        val listing =
            DiscoveredListing(
                id = product.id,
                name = product.name,
                brand = product.brand.ifBlank { null },
                category = product.category.ifBlank { null },
                imageUrl = product.imageUrl.ifBlank { null },
                merchantUrl = merchantUrl,
                source = source,
                providerListingId = product.providerListingId,
                observedPrice = product.price?.let { ObservedPrice(it, "USD", merchantUrl) },
                discoveredAt =
                    kotlin.time.Clock.System
                        .now()
                        .toString(),
            )
        val response =
            json
                .parseToJsonElement(
                    post(
                        "/api/cart/item",
                        buildJsonObject {
                            put("productId", product.id)
                            put("listing", json.parseToJsonElement(json.encodeToString(listing)))
                            put("quantity", quantity)
                        },
                    ),
                ).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun fetchCartItemCount(): Int {
        val response = json.parseToJsonElement(get("/api/cart?limit=100")).jsonObject
        return response["items"]?.jsonArray?.sumOf {
            it.jsonObject["quantity"]
                ?.jsonPrimitive
                ?.content
                ?.toIntOrNull() ?: 0
        } ?: 0
    }

    suspend fun setSavedProduct(
        product: ProductItem,
        saved: Boolean,
    ): Boolean {
        val listing =
            DiscoveredListing(
                id = product.id,
                name = product.name,
                brand = product.brand.ifBlank { null },
                category = product.category.ifBlank { null },
                imageUrl = product.imageUrl.ifBlank { null },
                merchantUrl = product.merchantUrl ?: throw IllegalArgumentException("A merchant URL is required to save a listing."),
                source = product.source ?: "parallel",
                providerListingId = product.providerListingId,
                observedPrice = product.price?.let { ObservedPrice(it, "USD", product.merchantUrl) },
                discoveredAt =
                    kotlin.time.Clock.System
                        .now()
                        .toString(),
            )
        return setSavedListing(product.id, saved, listing)
    }

    suspend fun setSavedListing(
        productId: String,
        saved: Boolean,
        listing: DiscoveredListing? = null,
    ): Boolean {
        val body =
            buildJsonObject {
                put("productId", productId)
                put("saved", saved)
                if (listing != null) put("listing", json.parseToJsonElement(json.encodeToString(listing)))
            }
        val response = json.parseToJsonElement(post("/api/saved", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    // ---- Wardrobe: user-owned photos/items and generated looks ------------

    suspend fun fetchWardrobeItems(): List<WardrobeItemData> {
        val response = json.parseToJsonElement(get("/api/wardrobe?limit=100")).jsonObject
        return response["items"]?.jsonArray?.mapNotNull { element ->
            element.jsonObject.toWardrobeItemData()
        } ?: emptyList()
    }

    suspend fun addWardrobeItem(
        clientId: String,
        kind: String,
        name: String,
        category: String,
        weatherSuitability: String,
        image: String,
        brand: String? = null,
        price: Double? = null,
        productId: String? = null,
        addedAt: Long =
            kotlin.time.Clock.System
                .now()
                .toEpochMilliseconds(),
        color: String? = null,
        mediaKey: String? = null,
        mediaAssetId: String? = null,
    ): Boolean {
        val body =
            buildJsonObject {
                put("clientId", clientId)
                put("kind", kind)
                put("name", name)
                put("category", category)
                put("weatherSuitability", weatherSuitability)
                put("image", image)
                put("addedAt", addedAt)
                brand?.let { put("brand", it) }
                price?.let { put("price", it) }
                productId?.let { put("productId", it) }
                color?.let { put("color", it) }
                mediaKey?.let { put("mediaKey", it) }
                mediaAssetId?.let { put("mediaAssetId", it) }
            }
        val response = json.parseToJsonElement(post("/api/wardrobe/item", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun removeWardrobeItem(clientId: String): Boolean {
        val response =
            json
                .parseToJsonElement(
                    post("/api/wardrobe/item/remove", buildJsonObject { put("clientId", clientId) }),
                ).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun fetchWardrobeOutfits(): List<WardrobeOutfitData> {
        val response = json.parseToJsonElement(get("/api/wardrobe/outfits?limit=100")).jsonObject
        return response["outfits"]?.jsonArray?.mapNotNull { element ->
            val objectValue = element.jsonObject
            val id = objectValue["_id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            WardrobeOutfitData(
                id = id,
                title = objectValue["title"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                description = objectValue["stylingAdvice"]?.jsonPrimitive?.contentOrNull,
                imageUrl =
                    objectValue["items"]
                        ?.jsonArray
                        ?.firstOrNull()
                        ?.jsonObject
                        ?.get("image")
                        ?.jsonPrimitive
                        ?.contentOrNull,
                items = objectValue["items"]?.jsonArray?.mapNotNull { it.jsonObject.toWardrobeItemData() }.orEmpty(),
            )
        } ?: emptyList()
    }

    // ---- Creator reference data --------------------------------------------

    suspend fun fetchCreatorTemplates(): List<CreativeTemplateData> {
        val response = json.parseToJsonElement(get("/api/creator/templates")).jsonObject
        return response["templates"]?.jsonArray?.mapNotNull { element ->
            val value = element.jsonObject
            val id = value["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            CreativeTemplateData(
                id = id,
                name = value["name"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                creator = value["creator"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                category = value["category"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                description = value["description"]?.jsonPrimitive?.contentOrNull,
                iconName = value["icon"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                promptExample = value["promptExample"]?.jsonPrimitive?.contentOrNull,
            )
        } ?: emptyList()
    }

    suspend fun fetchCreatorAgents(): List<CreatorAgentData> {
        val response = json.parseToJsonElement(get("/api/creator/agents")).jsonObject
        return response["agents"]?.jsonArray?.mapNotNull { element ->
            val value = element.jsonObject
            val id = value["id"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            CreatorAgentData(
                id = id,
                title = value["title"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                badge = null,
                subtitle = value["subtitle"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                iconName = value["icon"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                capabilities = value["capabilities"]?.jsonArray?.joinToString(", ") { it.jsonPrimitive.content } ?: "",
                quickPrompts =
                    value["quickPrompts"]
                        ?.jsonArray
                        ?.mapIndexed { index, prompt ->
                            val promptObject = prompt.jsonObject
                            QuickPromptData(
                                id = "${id}_$index",
                                label = promptObject["label"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                                prompt = promptObject["prompt"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                            )
                        }.orEmpty(),
            )
        } ?: emptyList()
    }

    // ---- Orders: purchase tracking / history ------------------------------

    suspend fun fetchOrders(): List<OrderRecord> {
        val response = json.parseToJsonElement(get("/api/orders?limit=50")).jsonObject
        return response["orders"]?.jsonArray?.mapNotNull { element ->
            runCatching {
                val obj = element.jsonObject
                val listing = obj["listing"]?.jsonObject
                val product =
                    DiscoveredListing(
                        id = listing?.get("id")?.jsonPrimitive?.content ?: obj["listingId"]?.jsonPrimitive?.content ?: "",
                        name = listing?.get("name")?.jsonPrimitive?.content ?: "",
                        merchantUrl = listing?.get("merchantUrl")?.jsonPrimitive?.content ?: "",
                        source = listing?.get("source")?.jsonPrimitive?.content ?: "parallel",
                        imageUrl = listing?.get("imageUrl")?.jsonPrimitive?.content,
                        category = listing?.get("category")?.jsonPrimitive?.content,
                        observedPrice =
                            listing?.get("observedPrice")?.jsonObject?.let { price ->
                                ObservedPrice(
                                    amount = price["amount"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0,
                                    currency = price["currency"]?.jsonPrimitive?.content ?: "USD",
                                    evidenceUrl = price["evidenceUrl"]?.jsonPrimitive?.content ?: "",
                                )
                            },
                        discoveredAt = listing?.get("discoveredAt")?.jsonPrimitive?.content ?: "",
                    )
                OrderRecord(
                    id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                    items =
                        listOf(
                            OrderItem(
                                product = product.toProductItem(),
                                quantity = obj["quantity"]?.jsonPrimitive?.content?.toIntOrNull() ?: 1,
                            ),
                        ),
                    totalAmount = (obj["amountCents"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0) / 100.0,
                    status = obj["status"]?.jsonPrimitive?.content ?: "",
                    trackingStatus = obj["trackingStatus"]?.jsonPrimitive?.content,
                    carrier = obj["carrier"]?.jsonPrimitive?.content,
                    trackingNumber = obj["trackingNumber"]?.jsonPrimitive?.content,
                    estimatedDelivery = obj["estimatedDelivery"]?.jsonPrimitive?.content,
                    returnStatus = obj["returnStatus"]?.jsonPrimitive?.content,
                    returnReason = obj["returnReason"]?.jsonPrimitive?.content,
                    reminderSet = obj["reminderSet"]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: false,
                    reminderTime = obj["reminderTime"]?.jsonPrimitive?.content,
                    paymentMethod = obj["paymentMethod"]?.jsonPrimitive?.content,
                )
            }.getOrNull()
        } ?: emptyList()
    }

    suspend fun acknowledgeDelivery(orderId: String): Boolean {
        require(orderId.isNotBlank()) { "Order ID is required." }
        val response =
            json
                .parseToJsonElement(
                    post("/api/orders/acknowledge", buildJsonObject { put("orderId", orderId) }),
                ).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun setOrderReminder(
        orderId: String,
        reminderTime: String,
    ): Boolean {
        val body =
            buildJsonObject {
                put("orderId", orderId)
                put("reminderTime", reminderTime)
            }
        val response = json.parseToJsonElement(post("/api/orders/reminder", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun requestOrderReturn(
        orderId: String,
        reason: String,
    ): Boolean {
        val body =
            buildJsonObject {
                put("orderId", orderId)
                put("reason", reason)
            }
        val response = json.parseToJsonElement(post("/api/orders/return", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    // ---- Grocery: user-scoped shopping list -------------------------------

    suspend fun fetchGroceryItems(): List<ConvexGroceryItem> {
        val response = json.parseToJsonElement(get("/api/grocery")).jsonObject
        return response["items"]?.jsonArray?.mapNotNull { element ->
            runCatching { json.decodeFromString<ConvexGroceryItem>(element.toString()) }.getOrNull()
        } ?: emptyList()
    }

    suspend fun addGroceryItem(
        name: String,
        category: String = "Other",
    ): Boolean {
        val body =
            buildJsonObject {
                put("name", name)
                put("category", category)
            }
        val response = json.parseToJsonElement(post("/api/grocery/item", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun setGroceryChecked(
        itemId: String,
        checked: Boolean,
    ): Boolean {
        val body =
            buildJsonObject {
                put("itemId", itemId)
                put("checked", checked)
            }
        val response = json.parseToJsonElement(post("/api/grocery/checked", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    suspend fun removeGroceryItem(itemId: String): Boolean {
        val body =
            buildJsonObject {
                put("itemId", itemId)
            }
        val response = json.parseToJsonElement(post("/api/grocery/remove", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    // ---- Travel: user-scoped trips ----------------------------------------

    suspend fun fetchTrips(): List<ConvexTrip> {
        val response = json.parseToJsonElement(get("/api/travel/trips")).jsonObject
        return response["trips"]?.jsonArray?.mapNotNull { element ->
            runCatching { json.decodeFromString<ConvexTrip>(element.toString()) }.getOrNull()
        } ?: emptyList()
    }

    suspend fun fetchTripDetail(tripId: String): ConvexTripDetail? {
        val response = json.parseToJsonElement(get("/api/travel/detail?tripId=${tripId.encodeURLParameter()}")).jsonObject
        return runCatching { json.decodeFromString<ConvexTripDetail>(response.toString()) }.getOrNull()
    }

    // ---- Profile / account façade (portions migrated from legacy ApiClient) ----

    suspend fun fetchUserProfile(uid: String): UserProfileData {
        var result = fetchCurrentUser()
        if (result == null) {
            bootstrapCurrentUser(null, null)
            result = fetchCurrentUser()
        }
        result = result ?: error("Authenticated profile was not found.")
        val savedCards =
            runCatching { fetchPaymentMethods() }.getOrDefault(emptyList()).mapNotNull { card ->
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
        updateCurrentUserProfile(profile.name, profile.avatarUrl)
        setPreferences(
            pushNotifications = profile.notificationsEnabled,
            vibes = profile.explicitInterests,
        )
        return true
    }

    suspend fun deactivateAccount(): Boolean {
        val operationId = requestAccountDeletion()
        return try {
            waitForAccountDeletion(operationId)
            deleteCurrentUserIdentity()
        } catch (error: Exception) {
            throw IllegalStateException(
                "Your account data is still being removed. Keep this session signed in and try again shortly.",
                error,
            )
        }
    }

    // ---- Travel view mappers ------------------------------------------------

    suspend fun fetchTravelTrips(): List<TripRecord> =
        fetchTrips().map { trip ->
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
        val detail = fetchTripDetail(tripId)
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

    // ---- Grocery (list-scoped legacy signatures, Convex-backed) -------------

    @Suppress("UNUSED_PARAMETER")
    suspend fun fetchGroceryList(listId: String): List<GroceryItem> =
        fetchGroceryItems().map { item ->
            GroceryItem(
                id = item.id,
                name = item.name,
                quantity = 1,
                unit = "item",
                category = item.category,
                estimatedPrice = 0.0,
                checked = item.checked,
            )
        }

    @Suppress("UNUSED_PARAMETER")
    suspend fun addGroceryItem(
        listId: String,
        productName: String,
        productId: String?,
        addedVia: String,
    ): Boolean = addGroceryItem(productName, addedVia)

    suspend fun toggleGroceryItem(
        id: String,
        isPurchased: Boolean,
    ): Boolean = setGroceryChecked(id, isPurchased)

    suspend fun deleteGroceryItem(id: String): Boolean = removeGroceryItem(id)

    // ---- Wardrobe styling + preferences façade -------------------------------

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
        return generateWardrobeOutfit(
            idempotencyKey = idempotencyKey,
            items = items,
            weatherCondition = normalizedWeather,
            temperatureText = temperatureText,
        )
    }

    suspend fun getUserPreferences(): Map<String, Any?> {
        val result = fetchPreferences() ?: return emptyMap()
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
        setPreferences(
            fitPreference = fitPreference,
            height = height,
            weight = weight,
            vibes = vibes,
        )
        return true
    }

    // ---- Weather context (server-bridged; clients never call providers) ------

    /** One server-verified weather reading: climate season + display text. */
    suspend fun fetchWeatherContext(latLng: Pair<Double, Double>): WeatherContext {
        val (latitude, longitude) = latLng
        val body =
            json
                .parseToJsonElement(
                    get("/api/context/weather?latitude=$latitude&longitude=$longitude"),
                ).jsonObject
        return WeatherContext(
            climate = body["climate"]?.jsonPrimitive?.contentOrNull ?: error("Weather data unavailable"),
            temperatureCelsius = body["temperatureCelsius"]?.jsonPrimitive?.doubleOrNull,
            temperatureText = body["temperatureText"]?.jsonPrimitive?.contentOrNull.orEmpty(),
        )
    }

    suspend fun addTravelExpense(
        tripId: String,
        amount: Double,
        currency: String,
        category: String,
        merchant: String,
    ): Boolean {
        val body =
            buildJsonObject {
                put("tripId", tripId)
                put("amount", amount)
                put("currency", currency)
                put("category", category)
                put("merchant", merchant)
            }
        val response = json.parseToJsonElement(post("/api/travel/expense", body)).jsonObject
        return response["success"]?.jsonPrimitive?.boolean == true
    }

    companion object {
        private val sharedClient: HttpClient by lazy {
            val client =
                HttpClient {
                    install(ContentNegotiation) {
                        json(Json { ignoreUnknownKeys = true })
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

/** User-scoped bookmark of an externally discovered listing snapshot. */
@kotlinx.serialization.Serializable
data class SavedListingRecord(
    val productId: String,
    val listing: DiscoveredListing? = null,
)

/** Server-verified weather reading for wardrobe styling context. */
data class WeatherContext(
    val climate: String,
    val temperatureCelsius: Double? = null,
    val temperatureText: String = "",
)

/** Grocery row as owned by the Convex grocery module. */
@kotlinx.serialization.Serializable
data class ConvexGroceryItem(
    val id: String,
    val name: String,
    val category: String,
    val checked: Boolean,
)

/** Trip row as owned by the Convex travel module. */
@kotlinx.serialization.Serializable
data class ConvexTrip(
    val id: String,
    val title: String,
    val destination: String,
    val startDate: String,
    val endDate: String,
    val status: String,
    val coverImage: String? = null,
    val budgetTotal: Double? = null,
)

/** Trip detail (events/expenses/voice notes) as owned by the Convex travel module. */
@kotlinx.serialization.Serializable
data class ConvexTripDetail(
    val events: List<ConvexTripEvent> = emptyList(),
    val expenses: List<ConvexTripExpense> = emptyList(),
    val voiceNotes: List<ConvexVoiceNote> = emptyList(),
)

@kotlinx.serialization.Serializable
data class ConvexTripEvent(
    val id: String,
    val type: String,
    val title: String,
    val description: String,
    val eventTime: String,
    val location: String,
    val price: Double? = null,
    val qrData: String? = null,
    val confirmationCode: String? = null,
    val gate: String? = null,
    val seat: String? = null,
)

@kotlinx.serialization.Serializable
data class ConvexTripExpense(
    val id: String,
    val amount: Double,
    val currency: String,
    val category: String,
    val merchant: String,
    val date: String,
)

@kotlinx.serialization.Serializable
data class ConvexVoiceNote(
    val id: String,
    val transcript: String,
    val createdAt: Long,
)
