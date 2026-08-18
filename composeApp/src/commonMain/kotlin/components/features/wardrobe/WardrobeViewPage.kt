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
import kotlinx.coroutines.launch
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
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import components.shared.widgets.MediaActionCard

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
    val photoUrl: String,
    val photoBytes: ByteArray? = null
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
    var photos by remember { mutableStateOf<List<WardrobePhoto>>(emptyList()) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        try {
            network.SpressoBackend.getWardrobeItems()
        } catch(e: Exception) {
            snackbarHostState.showSnackbar("Error: ${e.message}")
        }
    }

    var activeSeason by remember { mutableStateOf("Winter") }
    var stylingLoading by remember { mutableStateOf(false) }

    var curatedFits by remember(activeSeason) { mutableStateOf<List<CuratedFit>>(emptyList()) }
    LaunchedEffect(activeSeason) {
        try {
            network.SpressoBackend.getWardrobeOutfits()
        } catch(e: Exception) {
            snackbarHostState.showSnackbar("Error: ${e.message}")
        }
    }

    val handleAddPhoto: () -> Unit = {
        kotlinx.coroutines.GlobalScope.launch {
            try {
                network.SpressoBackend.addWardrobeItem(outfitId = "new", category = "Unknown", brand = "Unknown", imageUrl = "", color = "Unknown")
            } catch(e: Exception) {
                snackbarHostState.showSnackbar("Error: ${e.message}")
            }
        }
    }

    val layoutDirection = androidx.compose.ui.platform.LocalLayoutDirection.current
    val safeDrawingPadding = WindowInsets.safeDrawing.asPaddingValues()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        contentWindowInsets = WindowInsets(0.dp)
    ) { innerPadding ->
        LazyVerticalGrid(
            columns = GridCells.Adaptive(160.dp),
            modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface).padding(innerPadding),
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
            WardrobeHeaderBanner(handleAddPhoto)
        }

        // 2. Genkit AI Styling Engine
        item(span = { GridItemSpan(maxLineSpan) }) {
            WardrobeStylingEngineSection(
                activeSeason = activeSeason,
                onSeasonSelected = { activeSeason = it },
                stylingLoading = stylingLoading,
                curatedFits = curatedFits
            )
        }

        // 3. Photo Gallery Looks Title
        wardrobePhotoGalleryGrid(
            photos = photos,
            handleAddPhoto = handleAddPhoto,
            onSelectTryOn = onSelectTryOn
        )
    }
    }
}
