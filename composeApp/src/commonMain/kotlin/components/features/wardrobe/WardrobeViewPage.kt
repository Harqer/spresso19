package components.features.wardrobe

import network.ProductItem
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.core.NetworkImage
import io.ktor.client.HttpClient
import kotlinx.coroutines.delay
import androidx.compose.foundation.BorderStroke
import components.atoms.SpressoButton
import components.atoms.SpressoButtonVariant
import components.molecules.MediaActionCard

// Data Classes
data class CuratedFit(
    val fitName: String,
    val season: String,
    val stylingNotes: String,
    val items: List<String>
)

data class WardrobePhoto(
    val id: String,
    val title: String,
    val category: String,
    val photoUrl: String
)



@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WardrobeViewPage(
    displayMediaUrl: String? = null,
    httpClient: HttpClient? = null,
    onPickImageRequested: () -> Unit = {},
    onShareRequested: ((String) -> Unit)? = null,
    products: List<ProductItem> = emptyList(),
    onSelectTryOn: (ProductItem?) -> Unit = {},
    onRequestHITLCheckout: (Any) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var photos by remember {
        mutableStateOf(
            listOf(
                WardrobePhoto(
                    id = "w-1",
                    title = "Winter Shearling Trench",
                    category = "Winter Wear",
                    photoUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600"
                ),
                WardrobePhoto(
                    id = "w-2",
                    title = "Silk Evening Cocktail Dress",
                    category = "Special Occasion Wear",
                    photoUrl = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600"
                )
            )
        )
    }

    var activeSeason by remember { mutableStateOf("Winter") }
    var stylingLoading by remember { mutableStateOf(false) }

    val curatedFits = remember(activeSeason) {
        when (activeSeason) {
            "Winter" -> listOf(
                CuratedFit("Winter Luxe Trench", "Winter", "Layer over a dark turtleneck for contrast.", listOf("Trench Coat", "Turtleneck", "Boots")),
                CuratedFit("Cozy Cashmere Wrap", "Winter", "Perfect for indoor lounging or mild cold.", listOf("Cashmere Wrap", "Leggings"))
            )
            "Summer" -> listOf(
                CuratedFit("Summer Linen Fit", "Summer", "Breathable and light for hot days.", listOf("Linen Shirt", "Shorts", "Sandals")),
                CuratedFit("Beach Ready Set", "Summer", "A versatile look for the beach.", listOf("Swimwear", "Cover-up", "Sunglasses"))
            )
            else -> listOf(
                CuratedFit("Gala Silk Evening Gown", "Occasion", "Elegant evening wear for formal events.", listOf("Silk Gown", "Heels", "Clutch")),
                CuratedFit("Cocktail Party Suit", "Occasion", "Sharp and sophisticated.", listOf("Tailored Suit", "Dress Shirt", "Oxfords"))
            )
        }
    }

    LaunchedEffect(activeSeason) {
        stylingLoading = true
        delay(800) // Simulate network delay
        stylingLoading = false
    }

    val handleAddPhoto = {
        val categories = listOf("Winter Wear", "Hot Girl Summer", "Special Occasion Wear")
        val randomCat = categories.random()
        val newPhoto = WardrobePhoto(
            id = "w-${kotlin.random.Random.nextInt()}",
            title = "Custom $randomCat Look",
            category = randomCat,
            photoUrl = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600"
        )
        photos = listOf(newPhoto) + photos
    }

    val layoutDirection = androidx.compose.ui.platform.LocalLayoutDirection.current
    val safeDrawingPadding = WindowInsets.safeDrawing.asPaddingValues()

    LazyVerticalGrid(
        columns = GridCells.Adaptive(160.dp),
        modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface),
        contentPadding = PaddingValues(
            start = 16.dp + safeDrawingPadding.calculateStartPadding(layoutDirection),
            top = 16.dp + safeDrawingPadding.calculateTopPadding(),
            end = 16.dp + safeDrawingPadding.calculateEndPadding(layoutDirection),
            bottom = 16.dp + safeDrawingPadding.calculateBottomPadding()
        ),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Header Banner
        item(span = { GridItemSpan(maxLineSpan) }) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Checkroom, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
                            Text("My Wardrobe & Photo Gallery", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                        Text(
                            "Deep styling intelligence, weather-tailored fits, and virtual try-on integrations.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SpressoButton(
                            text = "Screen Lens",
                            onClick = { /* onOpenLens */ },
                            variant = SpressoButtonVariant.OUTLINE,
                            icon = Icons.Default.CenterFocusWeak,
                            trackingId = "wardrobe_view",
                            trackingAction = "click_screen_lens"
                        )

                        SpressoButton(
                            text = "Add Look",
                            onClick = handleAddPhoto,
                            variant = SpressoButtonVariant.PRIMARY,
                            icon = Icons.Default.Add,
                            trackingId = "wardrobe_view",
                            trackingAction = "click_add_look"
                        )
                    }
                }
            }
        }

        // 2. Genkit AI Styling Engine
        item(span = { GridItemSpan(maxLineSpan) }) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primary,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f))
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column {
                        Text("SMART STYLING ENGINE", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, letterSpacing = 1.sp)
                        Text("Weather-Tailored Outfit Curation", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }

                    // Pills
                    Row(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        val seasons = listOf(
                            Triple("Winter", "Winter Wear", Icons.Default.AcUnit),
                            Triple("Summer", "Hot Summer", Icons.Default.WbSunny),
                            Triple("Occasion", "Special Occasion", Icons.Default.AutoAwesome)
                        )
                        seasons.forEach { (id, label, icon) ->
                            val isSelected = activeSeason == id
                            Surface(
                                onClick = { activeSeason = id },
                                color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), // Increased touch target
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(icon, contentDescription = null, modifier = Modifier.size(14.dp), tint = if (isSelected) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(
                                        label,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = if (isSelected) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    if (stylingLoading) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = MaterialTheme.colorScheme.primary, strokeWidth = 2.dp)
                            Text("Curating tailor-made fits for $activeSeason...", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        }
                    } else {
                        // Fits grid
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            curatedFits.forEach { fit ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Text(fit.fitName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                                            Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(4.dp)) {
                                                Text(fit.season.uppercase(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                                            }
                                        }
                                        Text(fit.stylingNotes, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            fit.items.forEach { item ->
                                                Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(4.dp)) {
                                                    Text(item, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Photo Gallery Looks Title
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
}
