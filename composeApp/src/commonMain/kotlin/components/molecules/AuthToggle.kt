package components.molecules

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthToggle(
    mode: String,
    onModeChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth().height(44.dp),
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFFE8F3E8).copy(alpha = 0.5f)
    ) {
        Row(modifier = Modifier.padding(3.dp)) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable { onModeChange("signin") },
                shape = RoundedCornerShape(11.dp),
                color = if (mode == "signin") Color.White else Color.Transparent,
                shadowElevation = if (mode == "signin") 2.dp else 0.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "Sign In",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (mode == "signin") Color(0xFF386633) else Color(0xFF52645B)
                    )
                }
            }
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable { onModeChange("register") },
                shape = RoundedCornerShape(11.dp),
                color = if (mode == "register") Color.White else Color.Transparent,
                shadowElevation = if (mode == "register") 2.dp else 0.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "Create Account",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (mode == "register") Color(0xFF386633) else Color(0xFF52645B)
                    )
                }
            }
        }
    }
}
