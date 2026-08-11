package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.NetworkImage
import io.ktor.client.HttpClient

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Share

@Composable
fun WardrobeViewPage(
    displayMediaUrl: String?,
    httpClient: HttpClient,
    onPickImageRequested: () -> Unit,
    onShareRequested: ((String) -> Unit)? = null,
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
                            if (onShareRequested != null) {
                                onShareRequested("Check out my Virtual Try-On outfit from Spresso AI! $displayMediaUrl")
                            }
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
}
