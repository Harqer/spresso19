package components.organisms

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.UnfoldMore
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.molecules.CategoryTilesBar

@Composable
fun ProductCatalogHeader(
    selectedCategoryId: String,
    onCategorySelected: (String) -> Unit,
    userLocation: String?,
    searchRadius: Int,
    onRequestLocationPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = Color.White,
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, Color(0xFFD8EBD7)),
        shadowElevation = 0.dp
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Products",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF18211E)
                    )
                    Text(
                        text = if (userLocation != null) "Comparing deals near $userLocation" else "Browse products & compare local deals",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF5E635F)
                    )
                }
                Surface(
                    onClick = onRequestLocationPermission,
                    shape = CircleShape,
                    color = Color(0xFFF2F8F2),
                    border = BorderStroke(1.dp, Color(0xFFD8EBD7))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF386633), modifier = Modifier.size(14.dp))
                        Text(
                            text = if (userLocation != null) "$userLocation ($searchRadius mi)" else "Set Location",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Icon(Icons.Default.UnfoldMore, contentDescription = null, tint = Color(0xFF5E635F), modifier = Modifier.size(14.dp))
                    }
                }
            }

            CategoryTilesBar(
                selectedCategoryId = selectedCategoryId,
                onCategorySelected = onCategorySelected
            )
        }
    }
}
