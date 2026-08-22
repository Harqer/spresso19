package components.features.creators

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant

@Composable
fun CreatorStudioTabsRow(
    activeTab: Int,
    onTabSelected: (Int) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(modifier = Modifier.padding(4.dp)) {
            SpressoButton(
                text = "Community & Media",
                icon = Icons.Outlined.GridView,
                variant = if (activeTab == 0) SpressoButtonVariant.PRIMARY else SpressoButtonVariant.GHOST,
                onClick = { onTabSelected(0) },
                trackingId = "creator_tab_community",
                trackingAction = "click",
            )
            SpressoButton(
                text = "GenAI Agent Workspaces",
                icon = Icons.Outlined.SupportAgent,
                variant = if (activeTab == 1) SpressoButtonVariant.PRIMARY else SpressoButtonVariant.GHOST,
                onClick = { onTabSelected(1) },
                trackingId = "creator_tab_agents",
                trackingAction = "click",
            )
        }
    }
}
