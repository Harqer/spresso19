package components.features.creators

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.models.*
import network.ApiClient

@Composable
fun CreatorAgentsPage(
    apiClient: ApiClient,
    selectedTemplateId: String = "tmpl-1",
    onTemplateSelected: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var activeTab by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets.safeDrawing,
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .consumeWindowInsets(innerPadding)
                    .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                shadowElevation = 1.dp,
            ) {
                BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                    if (maxWidth > 650.dp) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            CreatorStudioHeader()
                            CreatorStudioTabsRow(activeTab) { activeTab = it }
                        }
                    } else {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            CreatorStudioHeader()
                            CreatorStudioTabsRow(activeTab) { activeTab = it }
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
