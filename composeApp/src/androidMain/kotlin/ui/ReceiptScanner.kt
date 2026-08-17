package ui

import android.graphics.BitmapFactory
import androidx.compose.runtime.Composable
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

@Composable
actual fun rememberReceiptScanner(
    onResult: (merchant: String, amount: String) -> Unit,
    onError: (String) -> Unit
): (ByteArray) -> Unit {
    return { bytes ->
        try {
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (bitmap != null) {
                val image = InputImage.fromBitmap(bitmap, 0)
                val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                recognizer.process(image)
                    .addOnSuccessListener { text ->
                        val lines = text.text.split("\n")
                        val merchant = lines.firstOrNull { it.isNotBlank() } ?: "Parsed Merchant"
                        val amountLine = lines.reversed().find { it.contains(Regex("\\d+\\.\\d{2}")) }
                        val amountMatch = amountLine?.let { Regex("\\d+\\.\\d{2}").find(it)?.value }
                        val amount = amountMatch ?: "0.00"
                        onResult(merchant, amount)
                    }
                    .addOnFailureListener {
                        onError("Failed to recognize text")
                    }
            } else {
                onError("Invalid image")
            }
        } catch(e: Exception) {
            onError("Processing error")
        }
    }
}
