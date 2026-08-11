package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.NetworkImage
import io.ktor.client.HttpClient

@Composable
fun WardrobeViewPage(
    displayMediaUrl: String?,
    httpClient: HttpClient,
    onPickImageRequested: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "My Smart Wardrobe",
                style = MaterialTheme.typography.titleLarge
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
                            Text("🧥", style = MaterialTheme.typography.displayMedium)
                            Text(
                                "No try-on results yet",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            
            Button(
                onClick = onPickImageRequested,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("📷 Take Photo / Upload Item")
            }
        }
    }
}
