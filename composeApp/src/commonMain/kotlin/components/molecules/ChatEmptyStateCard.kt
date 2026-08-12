package components.molecules

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.ChatSuggestionChip

@Composable
fun ChatEmptyStateCard(
    userName: String = "Shopper",
    onSelectSuggestion: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val greetingHeader = "Hey $userName, good morning!"

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = greetingHeader,
                    style = MaterialTheme.typography.titleMedium
                )
            }
            Text(
                text = "I'm your Spresso AI Personal Shopper. How can I help you find outfits, ingredients, or local retail deals today?",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ChatSuggestionChip(
                    label = "Running shoes",
                    icon = Icons.Default.ShoppingBag,
                    onClick = { onSelectSuggestion("Find running shoes under $100") }
                )
                ChatSuggestionChip(
                    label = "Outfit ideas",
                    icon = Icons.Default.Lightbulb,
                    onClick = { onSelectSuggestion("Recommend summer outfit ideas") }
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ChatSuggestionChip(
                    label = "Local deals",
                    icon = Icons.Default.LocalOffer,
                    onClick = { onSelectSuggestion("Show top local retail deals near me") }
                )
                ChatSuggestionChip(
                    label = "Recipe items",
                    icon = Icons.Default.Restaurant,
                    onClick = { onSelectSuggestion("Find ingredients for a healthy dinner") }
                )
            }
        }
    }
}
