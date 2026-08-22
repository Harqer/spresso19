package theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Immutable
data class ButtonStyle(
    val shape: Shape = RoundedCornerShape(9999.dp),
    val containerColor: Color = Color.Unspecified,
    val contentColor: Color = Color.Unspecified,
    val disabledContainerColor: Color = Color.Unspecified,
    val disabledContentColor: Color = Color.Unspecified,
    val minHeight: Dp = 44.dp,
)

@Immutable
data class CardStyle(
    val shape: Shape = RoundedCornerShape(16.dp),
    val containerColor: Color = Color.Unspecified,
    val contentColor: Color = Color.Unspecified,
    val elevation: Dp = 2.dp,
)

@Immutable
data class TextFieldStyle(
    val shape: Shape = RoundedCornerShape(12.dp),
    val containerColor: Color = Color.Unspecified,
    val contentColor: Color = Color.Unspecified,
    val focusedBorderColor: Color = Color.Unspecified,
    val unfocusedBorderColor: Color = Color.Unspecified,
)

@Immutable
data class ChipStyle(
    val shape: Shape = RoundedCornerShape(8.dp),
    val containerColor: Color = Color.Unspecified,
    val labelColor: Color = Color.Unspecified,
    val selectedContainerColor: Color = Color.Unspecified,
    val selectedLabelColor: Color = Color.Unspecified,
    val minHeight: Dp = 32.dp,
)

object ComponentStyles {
    val buttonStyle: ButtonStyle
        @Composable
        @ReadOnlyComposable
        get() =
            ButtonStyle(
                shape = RoundedCornerShape(9999.dp),
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                disabledContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f),
                disabledContentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f),
                minHeight = 44.dp,
            )

    val cardStyle: CardStyle
        @Composable
        @ReadOnlyComposable
        get() =
            CardStyle(
                shape = RoundedCornerShape(16.dp),
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                contentColor = MaterialTheme.colorScheme.onSurface,
                elevation = 2.dp,
            )

    val textFieldStyle: TextFieldStyle
        @Composable
        @ReadOnlyComposable
        get() =
            TextFieldStyle(
                shape = RoundedCornerShape(12.dp),
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                contentColor = MaterialTheme.colorScheme.onSurface,
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            )

    val chipStyle: ChipStyle
        @Composable
        @ReadOnlyComposable
        get() =
            ChipStyle(
                shape = RoundedCornerShape(8.dp),
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,
                selectedLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,
                minHeight = 32.dp,
            )
}
