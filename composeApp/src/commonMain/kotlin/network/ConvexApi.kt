package network

import components.features.catalog.DiscoveredListing
import components.features.catalog.ObservedPrice
import components.features.catalog.toProductItem
import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
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
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import network.models.OrderItem
import network.models.OrderRecord
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

@kotlinx.serialization.Serializable
data class UploadedMediaReference(
    val assetId: String,
    val mediaKey: String,
    val mimeType: String,
    val byteLength: Int,
    val sha256: String,
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
    private val json = Json { ignoreUnknownKeys = true }
    private val client: HttpClient
        get() = sharedClient
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

    @OptIn(ExperimentalEncodingApi::class)
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

    /** Resolve a known external listing by asking providers; never queries local inventory. */
    suspend fun fetchProductById(productId: String): ProductItem? {
        val products = searchProducts(productId)
        return products.firstOrNull { it.id == productId || it.providerListingId == productId } ?: products.firstOrNull()
    }

    // ---- Saved listings: durable user bookmarks ---------------------------

    suspend fun fetchSavedListings(): List<SavedListingRecord> {
        val response = json.parseToJsonElement(get("/api/saved?limit=100")).jsonObject
        return response["items"]?.jsonArray?.mapNotNull { element ->
            runCatching { json.decodeFromString<SavedListingRecord>(element.toString()) }.getOrNull()
        } ?: emptyList()
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
                    kotlinx.datetime.Clock.System
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
            kotlinx.datetime.Clock.System
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
        val response = json.parseToJsonElement(get("/api/travel/detail?tripId=$tripId")).jsonObject
        return runCatching { json.decodeFromString<ConvexTripDetail>(response.toString()) }.getOrNull()
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
            HttpClient {
                install(ContentNegotiation) {
                    json(Json { ignoreUnknownKeys = true })
                }
            }
        }
    }
}

/** User-scoped bookmark of an externally discovered listing snapshot. */
@kotlinx.serialization.Serializable
data class SavedListingRecord(
    val productId: String,
    val listing: DiscoveredListing? = null,
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
