package components.features.wardrobe

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.molecules.MediaActionCard
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant

data class WardrobePhotoItem(
    val id: String,
    val title: String,
    val category: String,
    val photoUrl: String,
    val isFavorite: Boolean = false
)



@Composable
fun WardrobePhotoCard(
    photo: WardrobePhotoItem,
    onTryOn: (WardrobePhotoItem) -> Unit,
    modifier: Modifier = Modifier
) {
    MediaActionCard(
        imageUrl = photo.photoUrl,
        title = photo.title,
        modifier = modifier,
        badgeContent = {
            Text(
                text = photo.category.uppercase(),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier
                    .padding(8.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.8f))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
        },
        actionRow = {
            SpressoButton(
                text = "Try On",
                onClick = { onTryOn(photo) },
                variant = SpressoButtonVariant.SECONDARY,
                icon = Icons.Default.Visibility,
                trackingId = "wardrobe_photo_item",
                trackingAction = "click_try_on_${photo.id}"
            )
        },
        trackingId = "wardrobe_photo_item",
        trackingAction = "click_photo_${photo.id}"
    )
}
