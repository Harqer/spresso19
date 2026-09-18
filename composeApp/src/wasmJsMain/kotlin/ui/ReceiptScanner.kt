package ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import network.ConvexApi
import network.inferImageMimeType

@Composable
actual fun rememberReceiptScanner(
    onResult: (merchant: String, amount: String) -> Unit,
    onError: (String) -> Unit,
): (ByteArray) -> Unit {
    val scope = rememberCoroutineScope()
    val convexApi = ConvexApi()

    return { bytes ->
        scope.launch {
            try {
                val uploaded = convexApi.uploadMedia(bytes, inferImageMimeType(bytes))
                val receipt = convexApi.parseTravelReceipt(uploaded.mediaKey)
                onResult(
                    receipt.merchantName.orEmpty().ifBlank { "Unknown merchant" },
                    receipt.total?.toString() ?: "",
                )
            } catch (_: Exception) {
                onError("Unable to scan this receipt. Please try again.")
            }
        }
    }
}
