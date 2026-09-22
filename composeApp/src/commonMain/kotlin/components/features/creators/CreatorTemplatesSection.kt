package components.features.creators

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.models.*
import network.ConvexApi

@Composable
@Suppress("UNUSED_PARAMETER")
fun CreatorTemplatesSection(
    apiClient: ConvexApi,
    scope: kotlinx.coroutines.CoroutineScope,
) {
    var templates by remember { mutableStateOf<List<network.CreativeTemplateData>>(emptyList()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    val convexApi = remember { network.ConvexApi() }

    LaunchedEffect(Unit) {
        try {
            val result = convexApi.fetchCreatorTemplates()
            templates = result
        } catch (e: Exception) {
            errorMessage = "Creative templates are unavailable right now. Please try again."
        } finally {
            isLoading = false
        }
    }

    if (errorMessage != null) {
        Text(
            text = errorMessage.orEmpty(),
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(16.dp),
        )
    } else if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    } else if (templates.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "No templates found",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Check back later for new creative templates.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    } else {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 160.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            items(templates) { template ->
                Card(
                    modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(
                                imageVector = Icons.Outlined.Style,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(32.dp),
                            )
                            Text(
                                text = template.name,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
    }
}
