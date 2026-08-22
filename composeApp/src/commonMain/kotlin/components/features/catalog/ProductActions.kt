package components.features.catalog

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.core.PrimaryButton
import components.models.*
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

@Composable
fun ProductActions(
    onVirtualTryOnClick: () -> Unit,
    onSpin360Click: () -> Unit,
    onLikeClick: () -> Unit,
    onShareClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        // Virtual Try-On Section
        PrimaryButton(
            text = "Virtual Try-On",
            onClick = onVirtualTryOnClick,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        // Additional description for Virtual Try-On to pad out molecule UI
        androidx.compose.material3.Text(
            text = "See how this product looks on you before buying.",
            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
            color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 16.dp, start = 4.dp, end = 4.dp),
        )

        // Spin 360 Section
        PrimaryButton(
            text = "Spin 360",
            onClick = onSpin360Click,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        // Additional description for Spin 360 to pad out molecule UI
        androidx.compose.material3.Text(
            text = "View the product from every angle in high fidelity 3D.",
            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
            color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 16.dp, start = 4.dp, end = 4.dp),
        )

        // Like and Share Section
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceEvenly,
        ) {
            PrimaryButton(
                text = "Like",
                onClick = onLikeClick,
                modifier = Modifier.weight(1f).padding(end = 4.dp),
            )
            PrimaryButton(
                text = "Share",
                onClick = onShareClick,
                modifier = Modifier.weight(1f).padding(start = 4.dp),
            )
        }
    }
}

@Preview
@Composable
fun ProductActionsPreview() {
    AppTheme {
        Surface(color = MaterialTheme.colorScheme.background) {
            ProductActions(
                onVirtualTryOnClick = {},
                onSpin360Click = {},
                onLikeClick = {},
                onShareClick = {},
            )
        }
    }
}
