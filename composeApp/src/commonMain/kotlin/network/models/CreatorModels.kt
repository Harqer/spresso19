package network.models

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.SmartToy
import androidx.compose.ui.graphics.vector.ImageVector

data class AgentMeta(
    val id: String,
    val title: String,
    val badge: String,
    val subtitle: String,
    val icon: ImageVector,
    val capabilities: List<String>,
    val quickPrompts: List<QuickPrompt>
)

data class QuickPrompt(val label: String, val prompt: String)

data class CreativeTemplate(
    val id: String,
    val name: String,
    val creator: String,
    val category: String,
    val description: String,
    val icon: ImageVector,
    val promptExample: String
)


