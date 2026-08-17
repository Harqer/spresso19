package components.features.chat

import components.models.*
import components.features.chat.cards.DiscoveryCard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import network.ApiClient
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import utils.GreetingManager

@Composable
fun ChatEmptyStateCard(
    userName: String? = null,
    userLocation: String? = null,
    onSelectSuggestion: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val greetingHeader = GreetingManager.getGreeting(userName)
    val locationContext = if (userLocation != null) " near $userLocation" else ""

    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Text(
            text = greetingHeader,
            style = MaterialTheme.typography.headlineLarge,
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.Normal,
            color = MaterialTheme.colorScheme.onSurface,
            letterSpacing = (-0.5).sp
        )

        Column(
            modifier = Modifier.widthIn(max = 672.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                DiscoveryCard(
                    id = "hot_drop",
                    badge = "HOT DROP",
                    isErrorTheme = true,
                    icon = Icons.Default.LocalFireDepartment,
                    title = "Nike & Brand Drops",
                    subtitle = "Check local sneaker releases & store stock drops",
                    prompt = "Show me latest Nike & brand sneaker drops$locationContext",
                    onClick = onSelectSuggestion,
                    modifier = Modifier.weight(1f),
                    trackingId = "hot_drop",
                    trackingAction = "click_suggestion"
                )
                DiscoveryCard(
                    id = "sale_20",
                    badge = "20%+ OFF",
                    isErrorTheme = false,
                    icon = Icons.Default.Sell,
                    title = "Area Store & Outlet Deals",
                    subtitle = "Discover top local & outlet sales",
                    prompt = "What local outlet sales and store deals are happening$locationContext?",
                    onClick = onSelectSuggestion,
                    modifier = Modifier.weight(1f),
                    trackingId = "sale_20",
                    trackingAction = "click_suggestion"
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                DiscoveryCard(
                    id = "market_steals",
                    badge = "MARKET STEALS",
                    isErrorTheme = false,
                    icon = Icons.Default.ShoppingCart,
                    title = "Fresh Grocery Deals",
                    subtitle = "Weekly grocery specials & local produce sales",
                    prompt = "Find weekly grocery specials and fresh produce deals$locationContext",
                    onClick = onSelectSuggestion,
                    modifier = Modifier.weight(1f),
                    trackingId = "market_steals",
                    trackingAction = "click_suggestion"
                )
                DiscoveryCard(
                    id = "trending",
                    badge = "TRENDING",
                    isErrorTheme = true,
                    icon = Icons.Default.AutoAwesome,
                    title = "Trending Tech & Style",
                    subtitle = "Popular fashion picks & audio accessories near you",
                    prompt = "Show me trending fashion picks and top audio tech$locationContext",
                    onClick = onSelectSuggestion,
                    modifier = Modifier.weight(1f),
                    trackingId = "trending",
                    trackingAction = "click_suggestion"
                )
            }
        }
    }
}

