package components.features.onboarding

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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.ExperimentalLayoutApi

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OnboardingInterestsCard(
    title: String,
    description: String,
    icon: ImageVector,
    isCompleted: Boolean,
    actionText: String,
    availableInterests: List<String>,
    onActionClick: (List<String>) -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = if (isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    val bgColor = if (isCompleted) MaterialTheme.colorScheme.surfaceContainerLowest else MaterialTheme.colorScheme.surface

    val selectedInterests = remember { mutableStateListOf<String>() }

    Box(
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(bgColor).border(1.5.dp, borderColor, RoundedCornerShape(16.dp)).padding(16.dp)
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
            
            // Grid of interests
            FlowRow(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                itemVerticalAlignment = Alignment.Top,
                overflow = androidx.compose.foundation.layout.FlowRowOverflow.Visible
            ) {
                availableInterests.forEach { interest ->
                    val isSelected = selectedInterests.contains(interest)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                            .clickable {
                                if (isSelected) selectedInterests.remove(interest)
                                else selectedInterests.add(interest)
                            }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = interest,
                            fontSize = 12.sp,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Box(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface).clickable {
                    if (selectedInterests.isNotEmpty()) {
                        onActionClick(selectedInterests.toList())
                    }
                }.padding(vertical = 10.dp), 
                contentAlignment = Alignment.Center
            ) {
                Text(text = actionText, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (isCompleted) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.surface)
            }
        }
    }
}
