package network

import com.google.firebase.Firebase
import com.google.firebase.functions.functions
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

actual suspend fun callFirebaseFunction(
    functionName: String,
    dataJson: String,
): String =
    try {
        val functions = Firebase.functions
        // Parse the JSON string into a Map/List structure that Firebase Functions accepts
        val dataMap =
            if (dataJson.isNotBlank() && dataJson != "{}") {
                jsonToMap(JSONObject(dataJson))
            } else {
                emptyMap<String, Any>()
            }

        val result = functions.getHttpsCallable(functionName).call(dataMap).await()

        // Serialize the result data back to a JSON string
        val resultData = result.data
        when (resultData) {
            is Map<*, *> -> JSONObject(resultData).toString()
            is List<*> -> JSONArray(resultData).toString()
            else -> resultData?.toString() ?: "{}"
        }
    } catch (e: Exception) {
        throw Exception("Failed to call $functionName: ${e.message}", e)
    }

private fun jsonToMap(jsonObject: JSONObject): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    val keys = jsonObject.keys()
    while (keys.hasNext()) {
        val key = keys.next()
        val value = jsonObject.get(key)
        map[key] =
            when (value) {
                is JSONObject -> jsonToMap(value)
                is JSONArray -> jsonToList(value)
                JSONObject.NULL -> null
                else -> value
            } as Any
    }
    return map
}

private fun jsonToList(jsonArray: JSONArray): List<Any?> {
    val list = mutableListOf<Any?>()
    for (i in 0 until jsonArray.length()) {
        val value = jsonArray.get(i)
        list.add(
            when (value) {
                is JSONObject -> jsonToMap(value)
                is JSONArray -> jsonToList(value)
                JSONObject.NULL -> null
                else -> value
            },
        )
    }
    return list
}
