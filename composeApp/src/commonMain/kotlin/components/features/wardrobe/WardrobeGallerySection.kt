package components.features.wardrobe

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.wardrobe.WardrobeAddPhotoCard
import components.features.wardrobe.WardrobePhotoCard
import components.features.wardrobe.WardrobePhotoItem

@Composable
fun WardrobeGallerySection(
    photos: List<WardrobePhotoItem>,
    weatherSummary: String,
    onAddPhotoClick: () -> Unit,
    onTryOnPhoto: (WardrobePhotoItem) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.secondaryContainer)
                .padding(12.dp)
        ) {
            Text(
                text = "Genkit AI Seasonal Styling Engine",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = weatherSummary,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        Text(
            text = "Your Wardrobe Photo Gallery",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        if (photos.isEmpty()) {
            WardrobeAddPhotoCard(onAddClick = onAddPhotoClick)
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp)
            ) {
                item {
                    WardrobeAddPhotoCard(onAddClick = onAddPhotoClick)
                }
                items(photos, key = { it.id }) { photo ->
                    WardrobePhotoCard(photo = photo, onTryOn = onTryOnPhoto)
                }
            }
        }
    }
}
