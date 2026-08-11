package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.molecules.AgentTemplateCard

@Composable
fun CreatorAgentsPage(
    selectedTemplateId: String,
    onTemplateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val templates = remember {
        listOf(
            Triple("chef", "Chef AI Live Assistant", "🍳 Learn recipes, cooking techniques, and grocery list generation live."),
            Triple("style", "Style Advisor AI", "👔 Scan outfits, match fits, and generate custom wardrobe recommendations."),
            Triple("travel", "Travel Companion AI", "🗺 Plan itineraries, explore cities, and get local translation help.")
        )
    }
    
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
                    "chef" -> "🍳"
                    "style" -> "👔"
                    else -> "🗺"
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
    }
}
