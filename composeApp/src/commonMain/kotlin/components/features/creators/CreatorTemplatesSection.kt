package components.features.creators

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import network.models.CREATIVE_TEMPLATES
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant

@Composable
fun CreatorTemplatesSection(apiClient: ApiClient, scope: kotlinx.coroutines.CoroutineScope) {
    var selectedTmpl by remember { mutableStateOf(CREATIVE_TEMPLATES[0]) }
    var prompt by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }
    var resultOutput by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
            shadowElevation = 2.dp
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(modifier = Modifier.size(40.dp), shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(selectedTmpl.icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(selectedTmpl.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("by ${selectedTmpl.creator}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                OutlinedTextField(
                    value = prompt,
                    onValueChange = { prompt = it },
                    placeholder = { Text(selectedTmpl.promptExample, fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    textStyle = LocalTextStyle.current.copy(fontSize = 12.sp)
                )
                SpressoButton(
                    text = "Generate with Template",
                    onClick = {
                        isGenerating = true
                        scope.launch {
                            try {
                                val res = apiClient.generateCreatorCampaign(prompt.ifBlank { selectedTmpl.promptExample }, selectedTmpl.id)
                                resultOutput = res["campaign"]?.jsonPrimitive?.content ?: "Studio synthesis complete."
                            } catch (e: Exception) { resultOutput = "Error: ${e.message}" }
                            finally { isGenerating = false }
                        }
                    },
                    isLoading = isGenerating,
                    modifier = Modifier.fillMaxWidth(),
                    trackingId = "creator_generate_${selectedTmpl.id}",
                    trackingAction = "click"
                )
                resultOutput?.let {
                    Surface(color = MaterialTheme.colorScheme.surfaceContainer, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                        Text(it, modifier = Modifier.padding(12.dp), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }

        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 300.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(CREATIVE_TEMPLATES) { tmpl ->
                AgentTemplateCard(
                    name = tmpl.name, creator = tmpl.creator, description = tmpl.description, category = tmpl.category,
                    icon = tmpl.icon, isActive = selectedTmpl.id == tmpl.id,
                    onSelect = { selectedTmpl = tmpl; prompt = ""; resultOutput = null },
                    onUseStyle = { selectedTmpl = tmpl; prompt = tmpl.promptExample }
                )
            }
        }
    }
}
