package components.features.wardrobe

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.dp
import components.models.*
import kotlinx.coroutines.launch

@Composable
@Suppress("UNUSED_PARAMETER")
fun WardrobePage(
    onNavigateToTryOn: (String) -> Unit,
    onOpenLens: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var photos by remember { mutableStateOf<List<WardrobePhotoItem>>(emptyList()) }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val convexApi = remember { network.ConvexApi() }

    val refreshWardrobe: () -> Unit = {
        scope.launch {
            try {
                val items = convexApi.fetchWardrobeItems()
                photos =
                    items.map { item ->
                        components.features.wardrobe.WardrobePhotoItem(
                            id = item.id,
                            title = item.brand ?: item.category,
                            category = item.category,
                            photoUrl = item.imageUrl,
                        )
                    }
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Unable to load your wardrobe. Please try again.")
            }
        }
    }

    val imagePicker =
        ui.rememberImagePicker { bytes ->
            if (bytes != null) {
                scope.launch {
                    try {
                        val userUid = network.getCurrentUserUid()
                        if (userUid == null) {
                            snackbarHostState.showSnackbar("Sign in to add a wardrobe photo.")
                            return@launch
                        }
                        val uuid = "wardrobe_${userUid}_${kotlin.time.Clock.System.now().toEpochMilliseconds()}"
                        snackbarHostState.showSnackbar("Adding photo…")
                        val uploaded = convexApi.uploadMedia(bytes, network.inferImageMimeType(bytes))
                        val uploadedUrl = convexApi.getMediaReadUrl(uploaded.assetId)

                        convexApi.addWardrobeItem(
                            clientId = uuid,
                            kind = "user_upload",
                            name = "Wardrobe photo",
                            category = "Uncategorized",
                            weatherSuitability = "ALL_WEATHER",
                            image = uploadedUrl,
                            addedAt =
                                kotlin.time.Clock.System
                                    .now()
                                    .toEpochMilliseconds(),
                            mediaKey = uploaded.mediaKey,
                            mediaAssetId = uploaded.assetId,
                        )

                        refreshWardrobe()
                        snackbarHostState.showSnackbar("Photo added to your wardrobe.")
                    } catch (e: Exception) {
                        snackbarHostState.showSnackbar("Unable to add this photo. Please try again.")
                    }
                }
            }
        }

    LaunchedEffect(Unit) {
        refreshWardrobe()
    }

    val weatherSummary = "Sign in and enable location for weather-matched outfit ideas."

    val layoutDirection = LocalLayoutDirection.current
    val insetsPadding = WindowInsets.safeDrawing.asPaddingValues()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        contentWindowInsets = WindowInsets(0.dp),
    ) { paddingValues ->
        LazyVerticalGrid(
            columns = GridCells.Adaptive(300.dp),
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(MaterialTheme.colorScheme.surfaceContainerLowest),
            contentPadding =
                PaddingValues(
                    start = insetsPadding.calculateStartPadding(layoutDirection) + 16.dp,
                    top = insetsPadding.calculateTopPadding() + 16.dp,
                    end = insetsPadding.calculateEndPadding(layoutDirection) + 16.dp,
                    bottom = insetsPadding.calculateBottomPadding() + 16.dp,
                ),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "My wardrobe",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = "Explore your saved looks and try items on before you buy.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            item {
                WardrobeGallerySection(
                    photos = photos,
                    weatherSummary = weatherSummary,
                    onAddPhotoClick = {
                        imagePicker()
                    },
                    onTryOnPhoto = { photo ->
                        onNavigateToTryOn(photo.id)
                    },
                )
            }
        }
    }
}
