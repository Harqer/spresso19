package components.shared.widgets

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@Composable
fun SpressoListItem(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    leadingIcon: ImageVector? = null,
    trailingContent: (@Composable () -> Unit)? = null,
    onClick: (() -> Unit)? = null,
    isEnabled: Boolean = true,
) {
    ListItem(
        headlineContent = {
            Text(
                text = title,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent =
            subtitle?.let {
                {
                    Text(
                        text = it,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            },
        leadingContent =
            leadingIcon?.let {
                {
                    Icon(
                        imageVector = it,
                        contentDescription = null,
                        tint =
                            if (isEnabled) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurface.copy(
                                    alpha = 0.38f,
                                )
                            },
                        modifier = Modifier.size(24.dp),
                    )
                }
            },
        trailingContent = trailingContent,
        modifier =
            modifier
                .fillMaxWidth()
                .then(
                    if (onClick != null && isEnabled) Modifier.clickable { onClick() } else Modifier,
                ),
        colors =
            ListItemDefaults.colors(
                containerColor = MaterialTheme.colorScheme.surface,
                headlineColor =
                    if (isEnabled) {
                        MaterialTheme.colorScheme.onSurface
                    } else {
                        MaterialTheme.colorScheme.onSurface.copy(
                            alpha = 0.38f,
                        )
                    },
                supportingColor =
                    if (isEnabled) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                            .copy(
                                alpha = 0.38f,
                            )
                    },
            ),
    )
}
