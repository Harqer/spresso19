package components.pages

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import theme.AppTheme

@Composable
fun ProfilePage(
    userUid: String?,
    onSignOut: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val brandBeige = Color(0xFFF2EFE8)

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(brandBeige)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Profile Header
        Surface(
            modifier = Modifier.size(100.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Person, 
                    null, 
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Spresso Shopper", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(userUid ?: "Anonymous User", style = MaterialTheme.typography.bodySmall, color = Color(0xFF52645B))
        }

        // Action Cards (Web Parity)
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ProfileListItem(icon = Icons.Default.Favorite, title = "My Favorites", subtitle = "View saved products")
            ProfileListItem(icon = Icons.Default.History, title = "Order History", subtitle = "Track your purchases")
            ProfileListItem(icon = Icons.Default.Settings, title = "App Settings", subtitle = "Privacy and preferences")
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF18211E))
        ) {
            Icon(Icons.Default.Logout, null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign Out", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ProfileListItem(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = Color.White.copy(alpha = 0.6f),
        border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFD8EBD7))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier.size(40.dp).background(Color(0xFFEAF3EA), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, modifier = Modifier.size(20.dp), tint = Color(0xFF386633))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(subtitle, fontSize = 12.sp, color = Color(0xFF5E635F))
            }
            Icon(Icons.Default.ChevronRight, null, tint = Color(0xFFD1D5DB))
        }
    }
}
