package components.features.creators

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.creators.AgentTemplateCard
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import network.ApiClient
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant

@Composable
fun CreatorTemplatesSection(apiClient: ApiClient, scope: kotlinx.coroutines.CoroutineScope) {
    var templates by remember { mutableStateOf<List<network.CreativeTemplateData>>(emptyList()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val result = network.SpressoBackend.getCreativeTemplates()
            templates = result
        } catch (e: Exception) {
            errorMessage = e.message
        } finally {
            isLoading = false
        }
    }

    if (errorMessage != null) {
        Text(text = "Error: $errorMessage", modifier = Modifier.padding(16.dp))
    } else if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    } else if (templates.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
//            Icon(
//                imageVector = androidx.compose.material.icons.Icons.Default.Check,
//                contentDescription = null,
//                modifier = Modifier.size(48.dp),
//                tint = MaterialTheme.colorScheme.onSurfaceVariant
//            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "No templates found",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Check back later for new creative templates.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    } else {
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(templates) { template ->
                Text(text = template.name, modifier = Modifier.padding(16.dp))
            }
        }
    }
}
