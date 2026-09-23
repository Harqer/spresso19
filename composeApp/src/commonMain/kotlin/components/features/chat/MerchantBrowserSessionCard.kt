package components.features.chat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import network.MerchantBrowserSession

/**
 * Compact merchant automation card shown above the chat composer while a
 * session is live (harness contract: chat stays primary, automation is a
 * card). Status presentation uses semantic Material roles — no hard-coded
 * colors — and exposes only the customer-safe actions: Expand is left to the
 * host (pane navigation), Pause/Resume and Take over go to Convex control.
 */
@Composable
fun MerchantBrowserSessionCard(
    session: MerchantBrowserSession,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onTakeOver: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        tonalElevation = 2.dp,
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(
                    imageVector = Icons.Filled.Person,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = "Shopping at ${session.merchantHost}",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                MerchantStatusLabel(status = session.status)
            }
            val pageTitle = session.pageTitle
            if (!pageTitle.isNullOrBlank()) {
                Text(
                    text = pageTitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            val handoff = session.handoffReason
            if (session.status == "HANDOFF_REQUIRED" && !handoff.isNullOrBlank()) {
                Text(
                    text = handoff,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                when (session.status) {
                    "PAUSED", "HANDOFF_REQUIRED" ->
                        TextButton(onClick = onResume) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("Resume")
                        }
                    "ACTIVE", "RESUMING", "STARTING" ->
                        TextButton(onClick = onPause) {
                            Icon(Icons.Filled.Pause, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("Pause")
                        }
                    else -> {}
                }
                if (session.status == "HANDOFF_REQUIRED") {
                    TextButton(onClick = onTakeOver) { Text("Take over") }
                }
            }
        }
    }
}

@Composable
private fun MerchantStatusLabel(
    status: String,
    modifier: Modifier = Modifier,
) {
    val (label, color) =
        when (status) {
            "ACTIVE", "RESUMING" -> "Running" to MaterialTheme.colorScheme.primary
            "PAUSED" -> "Paused" to MaterialTheme.colorScheme.onSurfaceVariant
            "HANDOFF_REQUIRED", "HUMAN_CONTROL" -> "Needs you" to MaterialTheme.colorScheme.error
            "COMPLETED" -> "Completed" to MaterialTheme.colorScheme.primary
            "FAILED", "EXPIRED" -> "Ended" to MaterialTheme.colorScheme.error
            else -> "Starting" to MaterialTheme.colorScheme.onSurfaceVariant
        }
    Text(text = label, style = MaterialTheme.typography.labelMedium, color = color, modifier = modifier)
}
