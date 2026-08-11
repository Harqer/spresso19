package components.atoms

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.call.body

@Composable
fun NetworkImage(
    url: String,
    client: HttpClient,
    contentDescription: String?,
    modifier: Modifier = Modifier
) {
    var imageBitmap by remember(url) { mutableStateOf<ImageBitmap?>(null) }
    var isLoading by remember(url) { mutableStateOf(true) }
    var isError by remember(url) { mutableStateOf(false) }

    LaunchedEffect(url) {
        if (url.isEmpty()) {
            isLoading = false
            isError = true
            return@LaunchedEffect
        }
        try {
            val responseBytes: ByteArray = client.get(url).body()
            imageBitmap = responseBytes.makeImageBitmap()
            isLoading = false
        } catch (_: Exception) {
            isLoading = false
            isError = true
        }
    }

    Box(
        modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator()
        } else if (imageBitmap != null) {
            Image(
                bitmap = imageBitmap!!,
                contentDescription = contentDescription,
                modifier = Modifier.matchParentSize()
            )
        } else {
            Text(
                text = "🖼",
                style = MaterialTheme.typography.titleLarge
            )
        }
    }
}
