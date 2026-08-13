package components.molecules

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun HeroBannerSection(
    title: String,
    subtitle: String,
    badgeText: String = "JETPACK MOTION UI",
    ratingText: String = "★ 4.8",
    onBannerClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF18211E), Color(0xFF2C3E35), Color(0xFF18211E))))
            .border(1.dp, Color(0xFF386633), RoundedCornerShape(24.dp))
            .clickable(onClick = onBannerClick)
            .padding(20.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(color = Color(0xFF386633), shape = RoundedCornerShape(8.dp)) {
                    Text(
                        text = badgeText, color = Color.White, fontSize = 9.sp,
                        fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(12.dp))
                    Text(ratingText, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Surface(color = Color.White.copy(alpha = 0.15f), shape = CircleShape, modifier = Modifier.size(36.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFF81C784), modifier = Modifier.size(20.dp))
                    }
                }
                Column {
                    Text(title, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(subtitle, color = Color(0xFFB0BEC5), fontSize = 12.sp)
                }
            }
        }
    }
}

