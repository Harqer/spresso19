package network

import kotlinx.coroutines.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * WasmJS actual implementation of SpressoBackend.
 * Data Connect SDK is natively bound via DataConnectInterop.kt (window.SpressoDataConnect).
 * Read operations and AI requests route through Cloud Functions HTTPS callable endpoints.
 */
actual object SpressoBackend {

    private val json = Json { ignoreUnknownKeys = true }

    // ── Grocery ──────────────────────────────────────────────────────────────

    actual suspend fun addGroceryItem(
        listId: String,
        productName: String,
        productId: String?,
        addedVia: String
    ) {
        SpressoDataConnect.addGroceryItem(
            parseJsonToJsAny(buildJson {
                put("listId", listId)
                put("productName", productName)
                put("productId", productId)
                put("addedVia", addedVia)
            })
        ).await<JsAny?>()
    }

    actual suspend fun toggleGroceryItem(itemId: String, isPurchased: Boolean) {
        SpressoDataConnect.toggleGroceryItem(
            parseJsonToJsAny(buildJson {
                put("itemId", itemId)
                put("isPurchased", isPurchased)
            })
        ).await<JsAny?>()
    }

    actual suspend fun deleteGroceryItem(itemId: String) {
        SpressoDataConnect.deleteGroceryItem(
            parseJsonToJsAny(buildJson { put("itemId", itemId) })
        ).await<JsAny?>()
    }

    // ── Onboarding ───────────────────────────────────────────────────────────

    actual suspend fun updateOnboardingStatus(currentStep: Int, isCompleted: Boolean) {
        SpressoDataConnect.updateOnboardingStatus(
            parseJsonToJsAny(buildJson {
                put("currentStep", currentStep)
                put("isCompleted", isCompleted)
            })
        ).await<JsAny?>()
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    actual suspend fun createOrder(
        authorizationId: String,
        productId: String,
        quantity: Int,
        totalAmount: Double,
        shippingAddress: String?,
        deviceSource: String,
        paymentMethod: String,
        userConfirmedToken: String?
    ) {
        SpressoDataConnect.createOrder(
            parseJsonToJsAny(buildJson {
                put("authorizationId", authorizationId)
                put("productId", productId)
                put("quantity", quantity)
                put("totalAmount", totalAmount)
                put("shippingAddress", shippingAddress)
                put("deviceSource", deviceSource)
                put("paymentMethod", paymentMethod)
                put("userConfirmedToken", userConfirmedToken)
            })
        ).await<JsAny?>()
    }

    // ── Travel ───────────────────────────────────────────────────────────────

    actual suspend fun createVoiceNote(tripId: String, transcript: String) {
        SpressoDataConnect.createVoiceNote(
            parseJsonToJsAny(buildJson {
                put("tripId", tripId)
                put("transcript", transcript)
            })
        ).await<JsAny?>()
    }

    actual suspend fun createTravelExpense(
        tripId: String,
        amount: Double,
        currency: String?,
        category: String,
        merchant: String,
        items: String?
    ) {
        SpressoDataConnect.createTravelExpense(
            parseJsonToJsAny(buildJson {
                put("tripId", tripId)
                put("amount", amount)
                put("currency", currency ?: "USD")
                put("category", category)
                put("merchant", merchant)
                put("items", items)
            })
        ).await<JsAny?>()
    }

    // ── Vision ───────────────────────────────────────────────────────────────

    actual suspend fun logVisionEvent(
        detectedObjects: String,
        context: String?,
        imageUrl: String?
    ) {
        SpressoDataConnect.logVisionEvent(
            parseJsonToJsAny(buildJson {
                put("detectedObjects", detectedObjects)
                put("context", context)
                put("imageUrl", imageUrl)
            })
        ).await<JsAny?>()
    }

    // ── Wardrobe ─────────────────────────────────────────────────────────────

    actual suspend fun getWardrobeOutfits(): List<WardrobeOutfitData> {
        val resultJs = SpressoDataConnect.getWardrobeOutfits().await<JsAny?>()
        val responseStr = stringifyJsAny(resultJs)
        val root = json.parseToJsonElement(responseStr).jsonObject
        val result = root["data"]?.jsonObject ?: root
        val outfits = result["wardrobeOutfits"]?.jsonArray ?: return emptyList()
        return outfits.mapNotNull { el ->
            val obj = el.jsonObject
            WardrobeOutfitData(
                id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                title = obj["title"]?.jsonPrimitive?.content ?: "",
                description = obj["description"]?.jsonPrimitive?.content,
                imageUrl = obj["imageUrl"]?.jsonPrimitive?.content,
                items = (obj["items"]?.jsonArray ?: kotlinx.serialization.json.JsonArray(emptyList()))
                    .mapNotNull { itemEl ->
                        val itemObj = itemEl.jsonObject
                        WardrobeItemData(
                            id = itemObj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                            category = itemObj["category"]?.jsonPrimitive?.content ?: "",
                            brand = itemObj["brand"]?.jsonPrimitive?.content,
                            imageUrl = itemObj["imageUrl"]?.jsonPrimitive?.content ?: "",
                            color = itemObj["color"]?.jsonPrimitive?.content
                        )
                    }
            )
        }
    }

    actual suspend fun getWardrobeItems(): List<WardrobeItemData> {
        val resultJs = SpressoDataConnect.getWardrobeItems().await<JsAny?>()
        val responseStr = stringifyJsAny(resultJs)
        val root = json.parseToJsonElement(responseStr).jsonObject
        val result = root["data"]?.jsonObject ?: root
        val items = result["wardrobeItems"]?.jsonArray ?: return emptyList()
        return items.mapNotNull { el ->
            val obj = el.jsonObject
            WardrobeItemData(
                id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                category = obj["category"]?.jsonPrimitive?.content ?: "",
                brand = obj["brand"]?.jsonPrimitive?.content,
                imageUrl = obj["imageUrl"]?.jsonPrimitive?.content ?: "",
                color = obj["color"]?.jsonPrimitive?.content
            )
        }
    }

    actual suspend fun addWardrobeItem(
        outfitId: String?,
        category: String,
        brand: String?,
        imageUrl: String,
        color: String?
    ) {
        SpressoDataConnect.addWardrobeItem(
            parseJsonToJsAny(buildJson {
                put("outfitId", outfitId)
                put("category", category)
                put("brand", brand)
                put("imageUrl", imageUrl)
                put("color", color)
            })
        ).await<JsAny?>()
    }

    // ── Creator ──────────────────────────────────────────────────────────────

    actual suspend fun getCreatorAgents(): List<CreatorAgentData> {
        val resultJs = SpressoDataConnect.getCreatorAgents().await<JsAny?>()
        val responseStr = stringifyJsAny(resultJs)
        val root = json.parseToJsonElement(responseStr).jsonObject
        val result = root["data"]?.jsonObject ?: root
        val agents = result["creatorAgents"]?.jsonArray ?: return emptyList()
        return agents.mapNotNull { el ->
            val obj = el.jsonObject
            CreatorAgentData(
                id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                title = obj["title"]?.jsonPrimitive?.content ?: "",
                badge = obj["badge"]?.jsonPrimitive?.content,
                subtitle = obj["subtitle"]?.jsonPrimitive?.content ?: "",
                iconName = obj["iconName"]?.jsonPrimitive?.content ?: "",
                capabilities = obj["capabilities"]?.jsonPrimitive?.content ?: "",
                quickPrompts = (obj["quickPrompts"]?.jsonArray
                    ?: kotlinx.serialization.json.JsonArray(emptyList()))
                    .mapNotNull { qpEl ->
                        val qpObj = qpEl.jsonObject
                        QuickPromptData(
                            id = qpObj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                            label = qpObj["label"]?.jsonPrimitive?.content ?: "",
                            prompt = qpObj["prompt"]?.jsonPrimitive?.content ?: ""
                        )
                    }
            )
        }
    }

    actual suspend fun getCreativeTemplates(): List<CreativeTemplateData> {
        val resultJs = SpressoDataConnect.getCreativeTemplates().await<JsAny?>()
        val responseStr = stringifyJsAny(resultJs)
        val root = json.parseToJsonElement(responseStr).jsonObject
        val result = root["data"]?.jsonObject ?: root
        val templates = result["creativeTemplates"]?.jsonArray ?: return emptyList()
        return templates.mapNotNull { el ->
            val obj = el.jsonObject
            CreativeTemplateData(
                id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                name = obj["name"]?.jsonPrimitive?.content ?: "",
                creator = obj["creator"]?.jsonPrimitive?.content ?: "",
                category = obj["category"]?.jsonPrimitive?.content ?: "",
                description = obj["description"]?.jsonPrimitive?.content,
                iconName = obj["iconName"]?.jsonPrimitive?.content ?: "",
                promptExample = obj["promptExample"]?.jsonPrimitive?.content
            )
        }
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private fun buildJson(block: MutableMap<String, Any?>.() -> Unit): String {
        val map = mutableMapOf<String, Any?>()
        map.block()
        val sb = StringBuilder("{")
        var first = true
        for ((k, v) in map) {
            if (!first) sb.append(",")
            sb.append("\"").append(k).append("\":")
            when (v) {
                null -> sb.append("null")
                is String -> sb.append("\"").append(v.replace("\\", "\\\\").replace("\"", "\\\"")).append("\"")
                is Boolean -> sb.append(v)
                is Number -> sb.append(v)
                else -> sb.append("\"").append(v.toString()).append("\"")
            }
            first = false
        }
        sb.append("}")
        return sb.toString()
    }
}
