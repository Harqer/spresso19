package components.features.creators

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.creators.CreatorAgentsSection
import components.features.creators.CreatorTemplatesSection
import network.ApiClient
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant

@Composable
fun CreatorAgentsPage(
    apiClient: ApiClient,
    selectedTemplateId: String = "tmpl-1",
    onTemplateSelected: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var activeTab by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets.safeDrawing
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            shadowElevation = 1.dp
        ) {
            BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                if (maxWidth > 650.dp) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        HeaderContent()
                        TabsRow(activeTab) { activeTab = it }
                    }
                } else {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        HeaderContent()
                        TabsRow(activeTab) { activeTab = it }
                    }
                }
            }
        }
        
        Box(modifier = Modifier.weight(1f)) {
            if (activeTab == 0) {
                CreatorTemplatesSection(apiClient, scope)
            } else {
                CreatorAgentsSection(apiClient, scope)
            }
        }
    }
    }
}

@Composable
private fun HeaderContent() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
            modifier = Modifier.size(48.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Outlined.AutoAwesome,
                    contentDescription = "Auto Awesome",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Spresso Creative Studio",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Surface(
                    color = MaterialTheme.colorScheme.primary,
                    shape = RoundedCornerShape(100.dp)
                ) {
                    Text(
                        text = "AI Video & Image Hub",
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        ),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp)
                    )
                }
            }
            Text(
                text = "Community Templates • Video & Image Generation • Style Reference Randomizer",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun TabsRow(activeTab: Int, onTabSelected: (Int) -> Unit) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(modifier = Modifier.padding(4.dp)) {
            SpressoButton(
                text = "Community & Media (5)",
                icon = Icons.Outlined.GridView,
                variant = if (activeTab == 0) SpressoButtonVariant.PRIMARY else SpressoButtonVariant.GHOST,
                onClick = { onTabSelected(0) },
                trackingId = "creator_tab_community",
                trackingAction = "click"
            )
            SpressoButton(
                text = "GenAI Agent Workspaces",
                icon = Icons.Outlined.SupportAgent,
                variant = if (activeTab == 1) SpressoButtonVariant.PRIMARY else SpressoButtonVariant.GHOST,
                onClick = { onTabSelected(1) },
                trackingId = "creator_tab_agents",
                trackingAction = "click"
            )
        }
    }
}
