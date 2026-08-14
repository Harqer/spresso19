package components.features.onboarding

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun OnboardingStepCard(
    title: String,
    description: String,
    icon: ImageVector,
    isCompleted: Boolean,
    actionText: String,
    onActionClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = if (isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    val bgColor = if (isCompleted) MaterialTheme.colorScheme.surfaceContainerLowest else MaterialTheme.colorScheme.surface

    Box(
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(bgColor).border(1.5.dp, borderColor, RoundedCornerShape(16.dp)).clickable { onActionClick() }.padding(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                        Icon(imageVector = icon, contentDescription = title, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    }
                    Text(text = title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                if (isCompleted) {
                    Icon(imageVector = Icons.Default.CheckCircle, contentDescription = "Completed", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                }
            }
            Text(text = description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
            Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface).padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
                Text(text = actionText, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (isCompleted) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.surface)
            }
        }
    }
}
