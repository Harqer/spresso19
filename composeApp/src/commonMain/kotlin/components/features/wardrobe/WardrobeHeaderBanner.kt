package components.features.wardrobe

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CenterFocusWeak
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant

@Composable
fun WardrobeHeaderBanner(
    handleAddPhoto: () -> Unit,
    onOpenLens: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(
                        Icons.Default.Checkroom,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp),
                    )
                    Text(
                        "My Wardrobe & Photo Gallery",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
                Text(
                    "Deep styling intelligence, weather-tailored fits, and virtual try-on integrations.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SpressoButton(
                    text = "Screen Lens",
                    onClick = onOpenLens,
                    variant = SpressoButtonVariant.OUTLINE,
                    icon = Icons.Default.CenterFocusWeak,
                    trackingId = "wardrobe_view",
                    trackingAction = "click_screen_lens",
                )

                SpressoButton(
                    text = "Add Look",
                    onClick = handleAddPhoto,
                    variant = SpressoButtonVariant.PRIMARY,
                    icon = Icons.Default.Add,
                    trackingId = "wardrobe_view",
                    trackingAction = "click_add_look",
                )
            }
        }
    }
}
