package components.shared.elements

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import network.ApiClient

enum class SpressoButtonVariant {
    PRIMARY,
    SECONDARY,
    OUTLINE,
    GHOST,
    DANGER,
}

@Composable
fun SpressoButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: SpressoButtonVariant = SpressoButtonVariant.PRIMARY,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    trackingId: String? = null,
    trackingAction: String? = null,
) {
    val coroutineScope = rememberCoroutineScope()
    val apiClient = remember { ApiClient() }
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = tween(durationMillis = 150),
    )

    val trackedOnClick = {
        if (trackingId != null && trackingAction != null) {
            coroutineScope.launch {
                apiClient.recordInteraction(trackingId, trackingAction)
            }
        }
        onClick()
    }
    val buttonColors =
        when (variant) {
            SpressoButtonVariant.PRIMARY ->
                ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                )
            SpressoButtonVariant.SECONDARY ->
                ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            SpressoButtonVariant.OUTLINE -> ButtonDefaults.outlinedButtonColors()
            SpressoButtonVariant.GHOST -> ButtonDefaults.textButtonColors()
            SpressoButtonVariant.DANGER ->
                ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError,
                )
        }

    val shape = RoundedCornerShape(12.dp)
    val contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)

    val content: @Composable RowScope.() -> Unit = {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color =
                    if (variant == SpressoButtonVariant.OUTLINE || variant == SpressoButtonVariant.GHOST) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onPrimary
                    },
                strokeWidth = 2.dp,
            )
        } else {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(text = text, style = MaterialTheme.typography.labelLarge)
        }
    }

    when (variant) {
        SpressoButtonVariant.OUTLINE -> {
            OutlinedButton(
                onClick = trackedOnClick,
                modifier =
                    modifier.heightIn(min = 48.dp).graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    },
                enabled = enabled && !isLoading,
                shape = shape,
                colors = buttonColors,
                interactionSource = interactionSource,
                contentPadding = contentPadding,
                content = content,
            )
        }
        SpressoButtonVariant.GHOST -> {
            TextButton(
                onClick = trackedOnClick,
                modifier =
                    modifier.heightIn(min = 48.dp).graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    },
                enabled = enabled && !isLoading,
                shape = shape,
                colors = buttonColors,
                interactionSource = interactionSource,
                contentPadding = contentPadding,
                content = content,
            )
        }
        else -> {
            Button(
                onClick = trackedOnClick,
                modifier =
                    modifier.heightIn(min = 48.dp).graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    },
                enabled = enabled && !isLoading,
                shape = shape,
                colors = buttonColors,
                interactionSource = interactionSource,
                contentPadding = contentPadding,
                content = content,
            )
        }
    }
}
