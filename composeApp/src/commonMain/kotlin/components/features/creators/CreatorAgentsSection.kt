package components.features.creators

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonPrimitive
import network.ApiClient
import network.models.AGENTS_METADATA
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant

@Composable
fun CreatorAgentsSection(apiClient: ApiClient, scope: kotlinx.coroutines.CoroutineScope) {
    var selectedAgent by remember { mutableStateOf(AGENTS_METADATA[0]) }
    var input by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }
    val messages = remember { mutableStateListOf<Pair<String, Boolean>>() }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 300.dp),
            modifier = Modifier.heightIn(max = 240.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(AGENTS_METADATA) { agent ->
                val isSelected = selectedAgent.id == agent.id
                Surface(
                    onClick = { selectedAgent = agent },
                    shape = RoundedCornerShape(16.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                    shadowElevation = if (isSelected) 2.dp else 0.dp
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Icon(agent.icon, null, tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                        Text(agent.title, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                        Text(agent.subtitle, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    }
                }
            }
        }

        Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(300.dp),
                    modifier = Modifier.weight(1f), 
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(messages) { (text, isUser) ->
                        Surface(
                            color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainer,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.align(if (isUser) Alignment.End else Alignment.Start).fillMaxWidth(0.85f)
                        ) {
                            Text(text, color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, modifier = Modifier.padding(10.dp))
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = input, onValueChange = { input = it },
                        placeholder = { Text("Ask ${selectedAgent.title}...", fontSize = 12.sp) },
                        modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)
                    )
                    SpressoButton(
                        text = "Send",
                        icon = Icons.AutoMirrored.Outlined.Send,
                        onClick = {
                            if (input.isNotBlank()) {
                                messages.add(input to true)
                                val currentInput = input
                                input = ""
                                isGenerating = true
                                scope.launch {
                                    try {
                                        val res = apiClient.generateCreatorCampaign(currentInput, selectedAgent.id)
                                        val out = res["campaign"]?.jsonPrimitive?.content ?: res["brief"]?.jsonPrimitive?.content ?: "Response generated."
                                        messages.add(out to false)
                                    } catch (e: Exception) { messages.add("Error: ${e.message}" to false) }
                                    finally { isGenerating = false }
                                }
                            }
                        },
                        enabled = !isGenerating && input.isNotBlank(),
                        isLoading = isGenerating,
                        trackingId = "creator_agent_msg_${selectedAgent.id}",
                        trackingAction = "send"
                    )
                }
            }
        }
    }
}
