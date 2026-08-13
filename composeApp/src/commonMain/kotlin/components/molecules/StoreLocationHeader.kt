package components.molecules

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.pages.toPriceString

@Composable
fun StoreLocationHeader(
    storeName: String = "Local Grocery Store",
    totalEstimated: Double = 0.0,
    itemCount: Int = 0,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Color(0xFFF2F8F2),
        border = BorderStroke(0.5.dp, Color(0xFFD8EBD7))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.ShoppingBag, null, tint = Color(0xFF386633), modifier = Modifier.size(24.dp))
                    Text("Grocery List", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF386633))
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 2.dp)) {
                    Icon(Icons.Default.LocationOn, null, tint = Color(0xFF5E635F), modifier = Modifier.size(14.dp))
                    Text(storeName, style = MaterialTheme.typography.bodySmall, color = Color(0xFF5E635F))
                }
            }
            if (itemCount > 0) {
                Column(horizontalAlignment = Alignment.End) {
                    Text("ESTIMATED TOTAL", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF5E635F))
                    Text("$${totalEstimated.toPriceString()}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF386633))
                }
            }
        }
    }
}
