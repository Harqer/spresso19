package components.features.wardrobe

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import components.models.*
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.shared.widgets.MediaActionCard

data class WardrobePhotoItem(
    val id: String,
    val title: String,
    val category: String,
    val photoUrl: String,
    val isFavorite: Boolean = false,
)

@Composable
fun WardrobePhotoCard(
    photo: WardrobePhotoItem,
    onTryOn: (WardrobePhotoItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    MediaActionCard(
        imageUrl = photo.photoUrl,
        title = photo.title,
        modifier = modifier,
        subtitle = photo.category,
        actionRow = {
            SpressoButton(
                text = "Try On",
                onClick = { onTryOn(photo) },
                variant = SpressoButtonVariant.SECONDARY,
                icon = Icons.Default.Visibility,
                trackingId = "wardrobe_photo_item",
                trackingAction = "click_try_on_${photo.id}",
            )
        },
        trackingId = "wardrobe_photo_item",
        trackingAction = "click_photo_${photo.id}",
    )
}
