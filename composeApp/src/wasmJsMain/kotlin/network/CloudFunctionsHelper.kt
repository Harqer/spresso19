package network

import io.ktor.client.HttpClient
import io.ktor.client.engine.js.Js
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json

/**
 * WasmJS actual implementation of callFirebaseFunction.
 * Routes to Firebase Cloud Functions HTTPS callable endpoints via Ktor.
 * Firebase Callable Functions expect POST with {"data": {...}} body and
 * respond with {"result": {...}}.
 */
private val httpClient by lazy {
    HttpClient(Js) {
        install(ContentNegotiation) {
            json(kotlinx.serialization.json.Json { ignoreUnknownKeys = true })
        }
    }
}

actual suspend fun callFirebaseFunction(
    functionName: String,
    dataJson: String,
): String {
    val authToken = getCurrentUserIdToken()
    val response =
        httpClient.post(
            "${SpressoConfig.cloudFunctionsBaseUrl}/$functionName",
        ) {
            contentType(ContentType.Application.Json)
            if (!authToken.isNullOrEmpty()) {
                header(HttpHeaders.Authorization, "Bearer $authToken")
            }
            setBody(dataJson)
        }
    return response.bodyAsText()
}
