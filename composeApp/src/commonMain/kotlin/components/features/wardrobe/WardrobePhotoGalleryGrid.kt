package components.features.wardrobe

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.shared.widgets.MediaActionCard
import network.ProductItem

fun LazyGridScope.wardrobePhotoGalleryGrid(
    photos: List<WardrobePhoto>,
    handleAddPhoto: () -> Unit,
    onSelectTryOn: (ProductItem?) -> Unit
) {
    item(span = { GridItemSpan(maxLineSpan) }) {
        Text("PHOTO GALLERY LOOKS (${photos.size})", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, letterSpacing = 1.sp, modifier = Modifier.padding(top = 16.dp))
    }

    if (photos.isEmpty()) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Surface(
                onClick = handleAddPhoto,
                modifier = Modifier.fillMaxWidth().height(192.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(12.dp), modifier = Modifier.size(48.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Add, null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(28.dp))
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text("Tap Plus to Add Your First Wardrobe Photo", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    } else {
        item {
            Surface(
                onClick = handleAddPhoto,
                modifier = Modifier.fillMaxWidth().height(224.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)) // Dashed isn't natively supported easily, using solid with alpha
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(12.dp), modifier = Modifier.size(40.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Add, null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(24.dp))
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text("Add Look", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
            }
        }

        items(photos) { p ->
            MediaActionCard(
                imageUrl = p.photoUrl,
                title = p.title,
                imageBytes = p.photoBytes,
                badgeContent = {
                    Surface(
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(p.category.uppercase(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.surface, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                    }
                },
                actionRow = {
                    SpressoButton(
                        text = "Try On",
                        onClick = { onSelectTryOn(null) },
                        variant = SpressoButtonVariant.SECONDARY,
                        icon = Icons.Default.Visibility,
                        trackingId = "wardrobe_photo",
                        trackingAction = "click_try_on_${p.id}"
                    )
                },
                trackingId = "wardrobe_photo_card",
                trackingAction = "click_photo_${p.id}"
            )
        }
    }
}
