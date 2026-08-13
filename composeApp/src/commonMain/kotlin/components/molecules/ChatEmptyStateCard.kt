package components.molecules

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.atoms.ChatSuggestionChip
import kotlin.time.Clock

@OptIn(kotlin.time.ExperimentalTime::class)
@Composable
fun ChatEmptyStateCard(
    userName: String = "Shopper",
    onSelectSuggestion: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val epochMillis = Clock.System.now().toEpochMilliseconds()
    val hour = ((epochMillis / 3600000) % 24).toInt()
    val timeGreeting = when { hour in 5..11 -> "Good morning"; hour in 12..16 -> "Good afternoon"; else -> "Good evening" }
    val greetingHeader = "$timeGreeting, ${if (userName.isNotBlank() && userName != "Shopper") userName else "Shopper"}!"

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        shape = RoundedCornerShape(28.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(modifier = Modifier.size(44.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
                    }
                    Text(text = greetingHeader, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                }
                Text("I'm your Spresso AI Personal Shopper. How can I help you find outfits, ingredients, or local retail deals today?", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 24.sp)
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Suggested Actions", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ChatSuggestionChip("Running shoes", { onSelectSuggestion("Find running shoes under $100") }, Icons.Default.ShoppingBag, Modifier.weight(1f))
                    ChatSuggestionChip("Outfit ideas", { onSelectSuggestion("Recommend summer outfit ideas") }, Icons.Default.Lightbulb, Modifier.weight(1f))
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ChatSuggestionChip("Local deals", { onSelectSuggestion("Show top local retail deals near me") }, Icons.Default.LocalOffer, Modifier.weight(1f))
                    ChatSuggestionChip("Recipe items", { onSelectSuggestion("Find ingredients for a healthy dinner") }, Icons.Default.Restaurant, Modifier.weight(1f))
                }
            }
        }
    }
}

