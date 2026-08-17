package components.features.wardrobe

import components.models.*
import androidx.compose.material3.MaterialTheme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
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
        mutableStateOf<List<WardrobePhotoItem>>(emptyList())
    }

    val weatherSummary = "Cold 32°F Winter Season — Tailored thermal cashmere layering & shearling outerwear curated for your fashion profile."

    val layoutDirection = LocalLayoutDirection.current
    val insetsPadding = WindowInsets.safeDrawing.asPaddingValues()

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        contentWindowInsets = WindowInsets(0.dp)
    ) { paddingValues ->
        LazyVerticalGrid(
            columns = GridCells.Adaptive(300.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.surfaceContainerLowest),
            contentPadding = PaddingValues(
                start = insetsPadding.calculateStartPadding(layoutDirection) + 16.dp,
                top = insetsPadding.calculateTopPadding() + 16.dp,
                end = insetsPadding.calculateEndPadding(layoutDirection) + 16.dp,
                bottom = insetsPadding.calculateBottomPadding() + 16.dp
            ),
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
                        scope.launch {
                            snackbarHostState.showSnackbar("Unable to add photo right now. Please try again.")
                        }
                    },
                    onTryOnPhoto = { photo ->
                        onNavigateToTryOn(photo.id)
                    }
                )
            }
        }
    }
}
