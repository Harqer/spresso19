package components.features.wardrobe

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.ktor.client.HttpClient
import network.ProductItem

// Data Classes
data class CuratedFit(
    val fitName: String,
    val season: String,
    val stylingNotes: String,
    val items: List<String>,
    val styleTips: List<String> = emptyList(),
)

data class WardrobePhoto(
    val id: String,
    val title: String,
    val category: String,
    val photoUrl: String,
    val photoBytes: ByteArray? = null,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WardrobeViewPage(
    displayMediaUrl: String? = null,
    httpClient: HttpClient? = null,
    currentLatLng: Pair<Double, Double>? = null,
    onPickImageRequested: () -> Unit = {},
    onShareRequested: ((String) -> Unit)? = null,
    products: List<ProductItem> = emptyList(),
    onSelectTryOn: (WardrobePhoto) -> Unit = {},
    onRequestHITLCheckout: (Any) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var photos by remember { mutableStateOf<List<WardrobePhoto>>(emptyList()) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        try {
            val items = network.SpressoBackend.getWardrobeItems()
            photos =
                items.map { item ->
                    WardrobePhoto(
                        id = item.id,
                        title = item.brand?.takeIf { it.isNotBlank() } ?: item.category,
                        category = item.category,
                        photoUrl = item.imageUrl,
                    )
                }
        } catch (e: Exception) {
            snackbarHostState.showSnackbar("Unable to load your wardrobe. Please try again.")
        }
    }

    var activeSeason by remember { mutableStateOf<String?>(null) }
    var temperatureText by remember { mutableStateOf<String?>(null) }
    var stylingLoading by remember { mutableStateOf(false) }
    val apiClient = remember { network.ApiClient() }

    val dynamicSeasons =
        remember {
            listOf(
                Triple("Winter", "Winter Wear", androidx.compose.material.icons.Icons.Default.AcUnit),
                Triple("Summer", "Hot Summer", androidx.compose.material.icons.Icons.Default.WbSunny),
                Triple("Occasion", "Special Occasion", androidx.compose.material.icons.Icons.Default.AutoAwesome),
            )
        }

    LaunchedEffect(Unit) {
        try {
            val coordinates = currentLatLng ?: return@LaunchedEffect
            val climate = apiClient.getWeatherContext(coordinates)
            activeSeason = climate
            temperatureText = apiClient.getTemperatureText(coordinates)
        } catch (e: Exception) {
            snackbarHostState.showSnackbar("Weather-based suggestions are unavailable right now.")
        }
    }

    var curatedFits by remember(activeSeason, photos, temperatureText) { mutableStateOf<List<CuratedFit>>(emptyList()) }
    LaunchedEffect(activeSeason, photos, temperatureText) {
        if (photos.isEmpty()) return@LaunchedEffect
        try {
            stylingLoading = true
            val outfit =
                apiClient.generateOutfit(
                    items = photos.map { photo ->
                        network.WardrobeItemData(
                            id = photo.id,
                            category = photo.category,
                            brand = photo.title,
                            imageUrl = photo.photoUrl,
                            color = null,
                        )
                    },
                    weatherCondition = activeSeason ?: "All seasons",
                    temperatureText = temperatureText ?: "",
                    userLocation = currentLatLng?.let { "${it.first},${it.second}" },
                )
            curatedFits =
                if (outfit != null) {
                    val idToName =
                        photos.associate { photo ->
                            photo.id to photo.title
                        }
                    listOf(
                        CuratedFit(
                            fitName = outfit.title ?: "Your styled look",
                            season = activeSeason ?: "All seasons",
                            stylingNotes = outfit.stylingAdvice ?: "",
                            items =
                                outfit.selectedItemIds.mapNotNull { id ->
                                    idToName[id] ?: "Item"
                                },
                            styleTips = outfit.styleTips,
                        ),
                    )
                } else {
                    emptyList()
                }
        } catch (e: Exception) {
            val message = e.message.orEmpty()
            snackbarHostState.showSnackbar(
                if (message.contains("limit reached", ignoreCase = true)) {
                    "You've hit your daily styling limit. Check back tomorrow for more outfit ideas."
                } else {
                    "Unable to load outfit suggestions. Please try again."
                },
            )
        } finally {
            stylingLoading = false
        }
    }

    val handleAddPhoto: () -> Unit = {
        onPickImageRequested()
    }

    val layoutDirection = androidx.compose.ui.platform.LocalLayoutDirection.current
    val safeDrawingPadding = WindowInsets.safeDrawing.asPaddingValues()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        contentWindowInsets = WindowInsets(0.dp),
    ) { innerPadding ->
        LazyVerticalGrid(
            columns = GridCells.Adaptive(160.dp),
            modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(innerPadding),
            contentPadding =
                PaddingValues(
                    start = 16.dp + safeDrawingPadding.calculateStartPadding(layoutDirection),
                    top = 16.dp + safeDrawingPadding.calculateTopPadding(),
                    end = 16.dp + safeDrawingPadding.calculateEndPadding(layoutDirection),
                    bottom = 16.dp + safeDrawingPadding.calculateBottomPadding(),
                ),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // 1. Header Banner
            item(span = { GridItemSpan(maxLineSpan) }) {
                WardrobeHeaderBanner(
                    handleAddPhoto = handleAddPhoto,
                    onOpenLens = onPickImageRequested,
                )
            }

            // 2. Outfit suggestions
            item(span = { GridItemSpan(maxLineSpan) }) {
                WardrobeStylingEngineSection(
                    activeSeason = activeSeason ?: "All seasons",
                    seasons = dynamicSeasons,
                    onSeasonSelected = { activeSeason = it },
                    stylingLoading = stylingLoading,
                    curatedFits = curatedFits,
                )
            }

            // 3. Photo Gallery Looks Title
            wardrobePhotoGalleryGrid(
                photos = photos,
                handleAddPhoto = handleAddPhoto,
                onSelectTryOn = onSelectTryOn,
            )
        }
    }
}
