package components.molecules

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.pages.toPriceString
import network.models.GroceryItem

@Composable
fun IngredientChecklistCard(
    item: GroceryItem,
    onToggle: (String) -> Unit,
    onDelete: (String) -> Unit,
    onAskAI: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, if (item.checked) Color.Transparent else Color(0xFFD8EBD7).copy(alpha = 0.5f)),
        shadowElevation = if (item.checked) 0.dp else 1.dp
    ) {
        Row(
            modifier = Modifier.padding(12.dp).alpha(if (item.checked) 0.5f else 1.0f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            IconButton(onClick = { onToggle(item.id) }, modifier = Modifier.size(24.dp)) {
                Icon(if (item.checked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked, null, tint = Color(0xFF386633))
            }
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            textDecoration = if (item.checked) TextDecoration.LineThrough else null
                        )
                    )
                    Surface(color = Color(0xFFEAF3EA), shape = RoundedCornerShape(4.dp)) {
                        Text(item.category, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF386633), modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                    }
                }
                if (item.storeNote != null) {
                    Text(item.storeNote, fontSize = 11.sp, color = Color(0xFF5E635F))
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (!item.checked) {
                    IconButton(onClick = onAskAI, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(18.dp), tint = Color(0xFF5E635F))
                    }
                }
                Text("$${(item.estimatedPrice * item.quantity).toPriceString()}", fontWeight = FontWeight.Bold, color = Color(0xFF386633), fontSize = 14.sp)
                IconButton(onClick = { onDelete(item.id) }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.DeleteOutline, null, modifier = Modifier.size(18.dp), tint = Color(0xFFD1D5DB))
                }
            }
        }
    }
}
