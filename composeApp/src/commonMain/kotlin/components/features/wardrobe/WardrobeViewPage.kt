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
    onPickImageRequested: () -> Unit = {},
    onShareRequested: ((String) -> Unit)? = null,
    products: List<ProductItem> = emptyList(),
    onSelectTryOn: (ProductItem?) -> Unit = {},
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
                        title = item.brand ?: "Unknown",
                        category = item.category ?: "Unknown",
                        photoUrl = item.imageUrl ?: "",
                    )
                }
        } catch (e: Exception) {
            snackbarHostState.showSnackbar("Error: ${e.message}")
        }
    }

    var activeSeason by remember { mutableStateOf("Winter") }
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
            val climate = apiClient.getWeatherContext()
            activeSeason = climate
        } catch (e: Exception) {
            // keep default
        }
    }

    var curatedFits by remember(activeSeason) { mutableStateOf<List<CuratedFit>>(emptyList()) }
    LaunchedEffect(activeSeason) {
        try {
            stylingLoading = true
            curatedFits =
                network.SpressoBackend.getWardrobeOutfits().map { outfit ->
                    CuratedFit(
                        fitName = outfit.title,
                        season = activeSeason, // fallback since it's missing in backend data
                        stylingNotes = outfit.description ?: "",
                        items = outfit.items.map { it.id },
                    )
                }
        } catch (e: Exception) {
            snackbarHostState.showSnackbar("Error: ${e.message}")
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

            // 2. Genkit AI Styling Engine
            item(span = { GridItemSpan(maxLineSpan) }) {
                WardrobeStylingEngineSection(
                    activeSeason = activeSeason,
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
