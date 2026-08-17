package components.features.profile

import components.models.*
import components.features.profile.organisms.ProfileListItem
import components.features.profile.organisms.ThemeSelectorCard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import network.ApiClient
import theme.ThemeMode
import utils.GreetingManager

@Composable
fun ProfilePage(
    userUid: String?,
    userName: String? = null,
    apiClient: ApiClient? = null,
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    onThemeModeChange: (ThemeMode) -> Unit = {},
    onSignOut: () -> Unit = {},
    onVerifyEmail: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val bgLight = MaterialTheme.colorScheme.background
    val scrollState = rememberScrollState()

    val isDark = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = if (isDark) MaterialTheme.colorScheme.surface else bgLight,
        contentWindowInsets = WindowInsets.safeDrawing
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
        // Profile Header
        Surface(
            modifier = Modifier.size(100.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.secondaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Outlined.AccountBox, 
                    null, 
                    modifier = Modifier.size(56.dp),
                    tint = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(GreetingManager.getGreeting(userName ?: "Explorer"), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(userUid ?: "Guest Session", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        // Action Cards (Web Parity Settings)
        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ProfileListItem(icon = Icons.Outlined.FavoriteBorder, title = "My Favorites", subtitle = "View saved products")
            ProfileListItem(icon = Icons.Outlined.History, title = "Order History", subtitle = "Track your purchases")
            ProfileListItem(icon = Icons.Outlined.NotificationsNone, title = "Notifications", subtitle = "Manage alerts and updates")
            ProfileListItem(icon = Icons.Outlined.CheckCircle, title = "Verify Email", subtitle = "Secure account with digital credentials", onClick = onVerifyEmail)
            
            ThemeSelectorCard(
                themeMode = themeMode,
                onThemeModeChange = onThemeModeChange
            )

            ProfileListItem(icon = Icons.Outlined.Security, title = "Privacy & Security", subtitle = "Biometric and account safety")
            ProfileListItem(icon = Icons.AutoMirrored.Outlined.HelpOutline, title = "Support", subtitle = "Contact Spresso Concierge")
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.AutoMirrored.Outlined.Logout, null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign Out", fontWeight = FontWeight.Bold)
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
    }
}

