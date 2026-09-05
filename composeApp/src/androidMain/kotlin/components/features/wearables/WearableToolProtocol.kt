package components.features.wearables

import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.UUID

internal data class WearableToolCall(
    val id: String,
    val name: String,
    val arguments: Map<String, String>,
)

internal object WearableToolCallParser {
    fun parse(message: String): List<WearableToolCall> {
        val root = JSONObject(message)
        val functionCalls = root.optJSONObject("toolCall")?.optJSONArray("functionCalls") ?: return emptyList()

        return buildList {
            for (index in 0 until functionCalls.length()) {
                val call = functionCalls.optJSONObject(index) ?: continue
                val name = call.optString("name").trim()
                if (name.isEmpty()) continue

                val arguments = call.optJSONObject("args").toStringMap()
                val suppliedId = call.optString("id").trim()
                val id = suppliedId.ifEmpty { deterministicId(name, arguments, index) }
                add(WearableToolCall(id = id, name = name, arguments = arguments))
            }
        }
    }

    private fun JSONObject?.toStringMap(): Map<String, String> {
        if (this == null) return emptyMap()
        return keys().asSequence().associateWith { key -> opt(key)?.toString().orEmpty() }
    }

    private fun deterministicId(
        name: String,
        arguments: Map<String, String>,
        index: Int,
    ): String {
        val canonicalArguments = arguments.toSortedMap().entries.joinToString("&") { (key, value) -> "$key=$value" }
        val source = "$name|$canonicalArguments|$index"
        return UUID.nameUUIDFromBytes(source.toByteArray(StandardCharsets.UTF_8)).toString()
    }
}

internal class ToolCallLedger(
    private val retentionMillis: Long = 5 * 60 * 1000L,
    private val maximumEntries: Int = 128,
) {
    private val claimedAt = LinkedHashMap<String, Long>()

    @Synchronized
    fun claim(
        callId: String,
        nowMillis: Long,
    ): Boolean {
        evictExpired(nowMillis)
        if (claimedAt.containsKey(callId)) return false

        claimedAt[callId] = nowMillis
        while (claimedAt.size > maximumEntries) {
            claimedAt.remove(claimedAt.keys.first())
        }
        return true
    }

    @Synchronized
    fun contains(callId: String): Boolean = claimedAt.containsKey(callId)

    @Synchronized
    private fun evictExpired(nowMillis: Long) {
        val iterator = claimedAt.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            if (nowMillis - entry.value >= retentionMillis) iterator.remove()
        }
    }
}
