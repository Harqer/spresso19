package components.core

import components.models.*

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.call.body
import network.ApiClient

@Composable
fun NetworkImage(
    url: String,
    client: HttpClient,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
    fallbackBytes: ByteArray? = null
) {
    var imageBitmap by remember(url, fallbackBytes) { mutableStateOf<ImageBitmap?>(null) }
    var isLoading by remember(url, fallbackBytes) { mutableStateOf(url.isNotEmpty() && fallbackBytes == null) }
    var isError by remember(url, fallbackBytes) { mutableStateOf(false) }

    LaunchedEffect(url, fallbackBytes) {
        if (fallbackBytes != null) {
            try {
                imageBitmap = fallbackBytes.makeImageBitmap()
                isLoading = false
            } catch (e: Exception) {
                isError = true
            }
            return@LaunchedEffect
        }
        if (url.isEmpty()) { isLoading = false; isError = true; return@LaunchedEffect }
        try {
            val responseBytes: ByteArray = client.get(url).body()
            imageBitmap = responseBytes.makeImageBitmap()
            isLoading = false
        } catch (_: Exception) { isLoading = false; isError = true }
    }

    Box(modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
        when {
            isLoading -> CircularProgressIndicator(modifier = Modifier.size(24.dp))
            imageBitmap != null -> Image(bitmap = imageBitmap!!, contentDescription = contentDescription, modifier = Modifier.matchParentSize(), contentScale = contentScale)
            else -> Icon(imageVector = Icons.Default.Image, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(32.dp))
        }
    }
}

