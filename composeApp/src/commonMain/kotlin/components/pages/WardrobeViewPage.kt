package components.pages

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.NetworkImage
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
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "My Smart Wardrobe",
            style = MaterialTheme.typography.titleLarge
        )

        WardrobeTabChips(
            selectedTabId = selectedSubTabId,
            onTabSelected = { selectedSubTabId = it }
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (displayMediaUrl != null && displayMediaUrl.startsWith("http")) {
                    NetworkImage(
                        url = displayMediaUrl,
                        client = httpClient,
                        contentDescription = "Virtual Try-On Output",
                        modifier = Modifier.fillMaxSize()
                    )
                } else if (displayMediaUrl != null) {
                    Text(
                        text = displayMediaUrl,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(16.dp)
                    )
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Checkroom,
                            contentDescription = "Wardrobe",
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            "No try-on results yet",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

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
