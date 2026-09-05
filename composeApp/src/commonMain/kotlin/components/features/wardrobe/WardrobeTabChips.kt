package components.features.wardrobe

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import components.models.*
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

data class WardrobeSubTab(
    val id: String,
    val label: String,
    val icon: ImageVector,
)

@Composable
fun WardrobeTabChips(
    selectedTabId: String,
    onTabSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val subTabs =
        listOf(
            WardrobeSubTab("ai_outfits", "AI Outfits", Icons.Default.AutoAwesome),
            WardrobeSubTab("seasonal", "Seasonal", Icons.Default.WbSunny),
            WardrobeSubTab("mix_match", "Mix & Match", Icons.Default.Tune),
            WardrobeSubTab("liked", "Liked", Icons.Default.Favorite),
            WardrobeSubTab("saved", "Saved", Icons.Default.Bookmark),
        )

    val selectedIndex = subTabs.indexOfFirst { it.id == selectedTabId }.coerceAtLeast(0)
    ScrollableTabRow(
        selectedTabIndex = selectedIndex,
        modifier = modifier,
        edgePadding = 16.dp,
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        subTabs.forEach { tab ->
            Tab(
                selected = selectedTabId == tab.id,
                onClick = { onTabSelected(tab.id) },
                text = { Text(tab.label, style = MaterialTheme.typography.labelMedium) },
                icon = {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                },
            )
        }
    }
}

@Preview
@Composable
fun WardrobeTabChipsPreview() {
    AppTheme {
        WardrobeTabChips(
            selectedTabId = "ai_outfits",
            onTabSelected = {},
        )
    }
}
