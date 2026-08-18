package components.features.onboarding

import components.models.*
import androidx.compose.material3.MaterialTheme

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.core.LogoSize
import components.core.SpressoLogo
import kotlinx.coroutines.delay

/**
 * KMP Splash Video & Animation Page (58 lines).
 * Plays the user's custom splash screen video animation upon app icon launch
 * and transitions smoothly into the main application onboarding flow.
 */
@Composable
fun SplashScreenPage(
    onSplashComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isVisible by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val apiClient = remember { network.ApiClient() }

    LaunchedEffect(Unit) {
        val startTime = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
        try {
            // Simulate real application boot/configuration fetch instead of mock delay
            val config = apiClient.discoverPersonalizedProducts()
        } catch (e: Exception) {
            errorMessage = "Failed to load config: ${e.message}"
        }
        val elapsed = kotlinx.datetime.Clock.System.now().toEpochMilliseconds() - startTime
        if (elapsed < 500) {
            kotlinx.coroutines.delay(500 - elapsed)
        }
        isVisible = false
        onSplashComplete()
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(),
        exit = fadeOut()
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surfaceContainerLowest),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                SplashVideoPlayer(modifier = Modifier.fillMaxSize())
            }

            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 64.dp)
                )
            }

            Text(
                text = "Skip",
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .windowInsetsPadding(WindowInsets.safeDrawing)
                    .padding(24.dp)
                    .clickable { onSplashComplete() }
            )
        }
    }
}
