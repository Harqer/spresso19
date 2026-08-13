package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.WardrobeItemCard
import components.molecules.WardrobeTabChips
import io.ktor.client.HttpClient

@Composable
fun WardrobeViewPage(
    displayMediaUrl: String?,
    httpClient: HttpClient,
    onPickImageRequested: () -> Unit,
    onShareRequested: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var selectedSubTabId by remember { mutableStateOf("ai_outfits") }

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(text = "My Smart Wardrobe", style = MaterialTheme.typography.titleLarge)

        WardrobeTabChips(
            selectedTabId = selectedSubTabId,
            onTabSelected = { selectedSubTabId = it }
        )

        WardrobeItemCard(
            title = if (displayMediaUrl != null && !displayMediaUrl.startsWith("http")) displayMediaUrl else "Virtual Try-On Output",
            category = "Smart Wardrobe Fits",
            imageUrl = displayMediaUrl,
            httpClient = httpClient,
            onItemClick = onPickImageRequested,
            modifier = Modifier.fillMaxWidth().height(260.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = onPickImageRequested,
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null)
                    Text("Try-On / Upload")
                }
            }

            if (displayMediaUrl != null) {
                OutlinedButton(
                    onClick = {
                        onShareRequested?.invoke("Check out my Virtual Try-On outfit from Spresso AI! $displayMediaUrl")
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null)
                        Text("Share Fit")
                    }
                }
            }
        }
    }
}
