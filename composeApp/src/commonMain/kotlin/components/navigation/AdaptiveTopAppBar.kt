package components.navigation

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.core.LogoSize
import components.core.SpressoLogo
import theme.ThemeMode
import components.features.chat.AIShopperInputBar

import androidx.compose.material.icons.filled.AccountCircle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdaptiveTopAppBar(
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
    onToggleDrawer: () -> Unit,
    onProfileClick: () -> Unit
) {
    val isDark = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
    }

    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onToggleDrawer) {
                    SpressoLogo(size = LogoSize.Small, showText = false)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Spresso",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black
                )
            }
        },
        actions = {
            IconButton(onClick = onProfileClick) {
                Icon(
                    imageVector = Icons.Default.AccountCircle,
                    contentDescription = "Profile and Settings"
                )
            }
            IconButton(onClick = {
                val nextMode = when (themeMode) {
                    ThemeMode.SYSTEM -> if (isDark) ThemeMode.LIGHT else ThemeMode.DARK
                    ThemeMode.LIGHT -> ThemeMode.DARK
                    ThemeMode.DARK -> ThemeMode.SYSTEM
                }
                onThemeModeChange(nextMode)
            }) {
                Icon(
                    imageVector = when (themeMode) {
                        ThemeMode.LIGHT -> Icons.Default.LightMode
                        ThemeMode.DARK -> Icons.Default.DarkMode
                        ThemeMode.SYSTEM -> Icons.Default.AutoAwesome
                    },
                    contentDescription = "Switch Theme Mode"
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            titleContentColor = MaterialTheme.colorScheme.onSurface
        )
    )
}
