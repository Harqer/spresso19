package components.features.catalog

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class CategoryTile(val id: String, val label: String, val icon: ImageVector)

@Composable
fun CategoryTilesBar(
    selectedCategoryId: String,
    onCategorySelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val categories = listOf(
        CategoryTile("ALL", "All Items", Icons.Default.GridView),
        CategoryTile("Trending", "Trending", Icons.Default.LocalFireDepartment),
        CategoryTile("Apparel", "Apparel", Icons.Default.Checkroom),
        CategoryTile("Winter Wear", "Winter Wear", Icons.Default.AcUnit),
        CategoryTile("Sports Wear", "Sports Wear", Icons.Default.FitnessCenter),
        CategoryTile("Makeup", "Makeup & Beauty", Icons.Default.Brush),
        CategoryTile("Accessories", "Accessories", Icons.Default.Watch),
        CategoryTile("Smart Wearables", "Wearables", Icons.Default.SmartToy),
        CategoryTile("Electronics", "Electronics", Icons.Default.Headphones)
    )

    LazyRow(modifier = modifier, contentPadding = PaddingValues(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(categories) { category ->
            val isSelected = selectedCategoryId == category.id
            Column(
                modifier = Modifier.width(80.dp).clip(RoundedCornerShape(16.dp))
                    .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                    .border(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
                    .clickable { onCategorySelected(category.id) }.padding(vertical = 12.dp, horizontal = 4.dp)
                    .then(if (isSelected) Modifier.scale(1.05f) else Modifier),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(modifier = Modifier.size(40.dp).background(if (isSelected) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface, CircleShape), contentAlignment = Alignment.Center) {
                    Icon(category.icon, contentDescription = null, modifier = Modifier.size(20.dp), tint = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                }
                Text(category.label, style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center), color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

