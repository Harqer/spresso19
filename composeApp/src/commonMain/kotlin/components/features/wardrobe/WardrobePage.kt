package components.features.wardrobe

import components.models.*
import androidx.compose.material3.MaterialTheme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.wardrobe.WardrobePhotoItem
import components.features.wardrobe.WardrobeGallerySection

@Composable
fun WardrobePage(
    onNavigateToTryOn: (String) -> Unit,
    onOpenLens: () -> Unit,
    modifier: Modifier = Modifier
) {
    var photos by remember {
        mutableStateOf(
            listOf(
                WardrobePhotoItem(
                    id = "p-1",
                    title = "Winter Luxe Trench",
                    category = "Winter Wear",
                    photoUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600"
                ),
                WardrobePhotoItem(
                    id = "p-2",
                    title = "Gala Silk Evening Gown",
                    category = "Special Occasion Wear",
                    photoUrl = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600"
                )
            )
        )
    }

    val weatherSummary = "Cold 32°F Winter Season — Tailored thermal cashmere layering & shearling outerwear curated for your fashion profile."

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surfaceContainerLowest)
            .windowInsetsPadding(WindowInsets.safeDrawing),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "My Digital Wardrobe & Fits",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "AI curated fits based on your styling preferences, weather forecasts, and occasion wear history.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        item {
            WardrobeGallerySection(
                photos = photos,
                weatherSummary = weatherSummary,
                onAddPhotoClick = {
                    val newPhoto = WardrobePhotoItem(
                        id = "p-${photos.size + 1}",
                        title = "Hot Summer Linen Fit",
                        category = "Summer Wear",
                        photoUrl = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600"
                    )
                    photos = photos + newPhoto
                },
                onTryOnPhoto = { photo ->
                    onNavigateToTryOn(photo.id)
                }
            )
        }
    }
}
