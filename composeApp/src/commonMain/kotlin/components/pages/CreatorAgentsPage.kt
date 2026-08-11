package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.AgentTemplateCard

import kotlinx.coroutines.launch
import network.ApiClient
import kotlinx.serialization.json.JsonObject

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.AutoAwesome

@Composable
fun CreatorAgentsPage(
    apiClient: ApiClient,
    selectedTemplateId: String,
    onTemplateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val templates = remember {
        listOf(
            Triple("chef", "Chef AI Live Assistant", "Learn recipes, cooking techniques, and grocery list generation live."),
            Triple("style", "Style Advisor AI", "Scan outfits, match fits, and generate custom wardrobe recommendations."),
            Triple("travel", "Travel Companion AI", "Plan itineraries, explore cities, and get local translation help.")
        )
    }
    
    var campaignPrompt by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }
    var campaignOutput by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "AI Creator Agents",
            style = MaterialTheme.typography.titleLarge
        )
        Text(
            text = "Select a specialized AI template context to load into your live assistant.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(templates) { template ->
                val id = template.first
                val title = template.second
                val desc = template.third
                val icon = when(id) {
                    "chef" -> Icons.Default.Restaurant
                    "style" -> Icons.Default.Checkroom
                    else -> Icons.Default.Explore
                }
                
                AgentTemplateCard(
                    title = title,
                    description = desc,
                    icon = icon,
                    isSelected = selectedTemplateId == id,
                    onSelect = { onTemplateSelected(id) }
                )
            }
        }

        // Interactive Campaign Generator Section
        OutlinedTextField(
            value = campaignPrompt,
            onValueChange = { campaignPrompt = it },
            label = { Text("Campaign Goal / Product Prompt") },
            placeholder = { Text("e.g. Launching a new summer eco-friendly jacket collection") },
            modifier = Modifier.fillMaxWidth()
        )

        Button(
            onClick = {
                if (campaignPrompt.isNotBlank()) {
                    isGenerating = true
                    scope.launch {
                        try {
                            val res = apiClient.generateCreatorCampaign(campaignPrompt, selectedTemplateId)
                            campaignOutput = res.toString()
                        } catch (e: Exception) {
                            campaignOutput = "Error generating campaign: ${e.message}"
                        } finally {
                            isGenerating = false
                        }
                    }
                }
            },
            enabled = !isGenerating && campaignPrompt.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isGenerating) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null)
                    Text("Generate AI Creator Campaign")
                }
            }
        }

        if (campaignOutput != null) {
            Card(
                modifier = Modifier.fillMaxWidth().heightIn(max = 160.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Text(
                    text = campaignOutput!!,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
    }
}
