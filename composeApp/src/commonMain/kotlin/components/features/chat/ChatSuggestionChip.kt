package components.features.chat

import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.TextButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import components.models.*

@Composable
fun ChatSuggestionChip(
    label: String,
    onClick: (String) -> Unit,
    icon: ImageVector? = null,
    modifier: Modifier = Modifier,
) {
    TextButton(
        onClick = { onClick(label) },
        shape = RoundedCornerShape(8.dp),
        colors =
            ButtonDefaults.textButtonColors(
                contentColor = MaterialTheme.colorScheme.primary,
            ),
        modifier = modifier,
    ) {
        icon?.let {
            Icon(it, contentDescription = null, modifier = Modifier.size(18.dp))
        }
        Text(label, style = MaterialTheme.typography.labelLarge)
    }
}
