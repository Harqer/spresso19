package components.features.wardrobe

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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

    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(subTabs) { tab ->
            val isSelected = selectedTabId == tab.id
            FilterChip(
                selected = isSelected,
                onClick = { onTabSelected(tab.id) },
                label = { Text(tab.label, style = MaterialTheme.typography.labelMedium) },
                leadingIcon = {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                },
                colors =
                    FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ),
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
