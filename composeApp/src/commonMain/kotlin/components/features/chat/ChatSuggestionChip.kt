package components.features.chat

import androidx.compose.foundation.layout.size
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import components.models.*
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

@Composable
fun ChatSuggestionChip(
    label: String,
    onClick: (String) -> Unit,
    icon: ImageVector? = null,
    modifier: Modifier = Modifier,
) {
    AssistChip(
        onClick = { onClick(label) },
        label = { Text(label, style = MaterialTheme.typography.labelMedium) },
        leadingIcon =
            if (icon != null) {
                { Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp)) }
            } else {
                null
            },
        colors =
            AssistChipDefaults.assistChipColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                leadingIconContentColor = MaterialTheme.colorScheme.primary,
            ),
        modifier = modifier,
    )
}

@Preview
@Composable
fun ChatSuggestionChipPreview() {
    AppTheme {
        ChatSuggestionChip(
            label = "Summer Outfits",
            onClick = { println("Preview Summer Outfits clicked") },
        )
    }
}
