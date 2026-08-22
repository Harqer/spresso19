package components.features.chat

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import components.models.*
import network.models.GroundingSource

@Composable
fun ChatGroundingSources(
    sources: List<GroundingSource>,
    textColor: Color = MaterialTheme.colorScheme.onSurface,
    modifier: Modifier = Modifier,
) {
    if (sources.isEmpty()) return
    Column(modifier = modifier) {
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), thickness = 0.5.dp, color = textColor.copy(alpha = 0.1f))
        Text(
            "Sources",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = textColor.copy(alpha = 0.6f),
            modifier = Modifier.padding(bottom = 4.dp),
        )
        sources.take(3).forEach { source ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.padding(vertical = 2.dp),
            ) {
                Icon(Icons.Default.Link, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.primary)
                Text(
                    text = source.title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    textDecoration = TextDecoration.Underline,
                    maxLines = 1,
                )
            }
        }
    }
}
