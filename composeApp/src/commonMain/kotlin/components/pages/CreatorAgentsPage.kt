package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.AgentTemplateCard
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonPrimitive
import network.ApiClient

@Composable
fun CreatorAgentsPage(
    apiClient: ApiClient = remember { ApiClient() },
    selectedTemplateId: String = "economic",
    onTemplateSelected: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val templates = remember {
        listOf(
            Triple("economic", "Global Economic Research Agent", "Inflation indexing, macro retail trends, supply chain pricing analysis."),
            Triple("marketing", "Regional Marketing Coordinator", "A/B campaign copy testing, local demographic ad spend optimization."),
            Triple("brand", "Creative Brand Studio Agent", "AI visual moodboards, brand tone of voice, lookbook generation."),
            Triple("audit", "Global Client Audit Agent", "Compliance verification, fraud detection, GDPR & PCI security audit.")
        )
    }

    var campaignPrompt by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }
    var campaignOutput by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(modifier = modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Enterprise GenAI Creator Agents", style = MaterialTheme.typography.titleLarge)
        Text("Select a specialized AI agent persona to orchestrate campaign analytics or brand assets.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
            items(templates) { (id, title, desc) ->
                val icon = when (id) { "economic" -> Icons.Default.Analytics; "marketing" -> Icons.Default.Campaign; "brand" -> Icons.Default.Palette; else -> Icons.Default.Security }
                AgentTemplateCard(title = title, description = desc, icon = icon, isSelected = selectedTemplateId == id, onSelect = { onTemplateSelected(id) })
            }
        }

        OutlinedTextField(value = campaignPrompt, onValueChange = { campaignPrompt = it }, label = { Text("Campaign Goal / Brief Prompt") }, placeholder = { Text("e.g. Launching eco-friendly summer collection") }, modifier = Modifier.fillMaxWidth())

        Button(
            onClick = {
                if (campaignPrompt.isNotBlank()) {
                    isGenerating = true
                    scope.launch {
                        try {
                            val res = apiClient.generateCreatorCampaign(campaignPrompt, selectedTemplateId)
                            campaignOutput = res["campaign"]?.jsonPrimitive?.content ?: res["brief"]?.jsonPrimitive?.content ?: res.toString()
                        } catch (e: Exception) { campaignOutput = "Error: ${e.message}" }
                        finally { isGenerating = false }
                    }
                }
            },
            enabled = !isGenerating && campaignPrompt.isNotBlank(), modifier = Modifier.fillMaxWidth()
        ) {
            if (isGenerating) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            else Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null)
                Text("Generate Enterprise Agent Brief")
            }
        }

        campaignOutput?.let {
            Card(modifier = Modifier.fillMaxWidth().heightIn(max = 140.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp))
            }
        }
    }
}

