package components.features.vision

import components.models.*

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import components.shared.elements.SpressoButton
import components.shared.elements.SpressoButtonVariant
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun SmartVisionControlsOverlay(
    onPickLensImage: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.PhotoCamera, null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(24.dp))
            Text("Smart Vision", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.onSurface)
        }
        
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            SpressoButton(
                text = "Live Camera",
                icon = Icons.Default.PhotoCamera,
                variant = SpressoButtonVariant.SECONDARY,
                onClick = onPickLensImage,
                trackingId = "vision_live_camera",
                trackingAction = "click"
            )
            
            SpressoButton(
                text = "Upload",
                icon = Icons.Default.Upload,
                variant = SpressoButtonVariant.SECONDARY,
                onClick = onPickLensImage,
                trackingId = "vision_upload",
                trackingAction = "click"
            )
            
            SpressoButton(
                text = "Refresh",
                icon = Icons.Default.Refresh,
                variant = SpressoButtonVariant.SECONDARY,
                onClick = onPickLensImage,
                trackingId = "vision_refresh",
                trackingAction = "click"
            )
        }
    }
}
