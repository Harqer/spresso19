package ui

import androidx.compose.runtime.Composable
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import network.ApiClient
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

import androidx.compose.runtime.rememberCoroutineScope

@OptIn(ExperimentalEncodingApi::class)
@Composable
actual fun rememberReceiptScanner(
    onResult: (merchant: String, amount: String) -> Unit,
    onError: (String) -> Unit
): (ByteArray) -> Unit {
    val scope = rememberCoroutineScope()
    
    return { bytes ->
        scope.launch {
            try {
                val client = ApiClient()
                val base64Data = Base64.encode(bytes)
                val response = client.performLensSearch(base64Data)
                val firstItem = response.detectedResult?.detectedItems?.firstOrNull()
                val merchant = firstItem?.brandGuess ?: firstItem?.detectedName ?: response.apifyResults.firstOrNull()?.title ?: "Parsed Merchant"
                val amount = firstItem?.priceEstimate?.toString() ?: response.apifyResults.firstOrNull()?.price?.toString() ?: "0.00"
                onResult(merchant, amount)
            } catch (e: Exception) {
                onError("Unable to scan this receipt. Please try again.")
            }
        }
    }
}
