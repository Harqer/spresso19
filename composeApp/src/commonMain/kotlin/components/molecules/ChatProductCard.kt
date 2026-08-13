package components.molecules

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.atoms.NetworkImage
import io.ktor.client.HttpClient
import network.ProductItem

@Composable
fun ChatProductCard(
    product: ProductItem,
    onAddToCart: (ProductItem) -> Unit = {},
    onSelectTryOn: (ProductItem) -> Unit = {},
    httpClient: HttpClient? = null,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh), contentAlignment = Alignment.Center) {
                if (httpClient != null && product.imageUrl.isNotEmpty()) {
                    NetworkImage(url = product.imageUrl, client = httpClient, contentDescription = product.name, modifier = Modifier.matchParentSize(), contentScale = ContentScale.Crop)
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                        Text("High-Fidelity Preview", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
                    }
                }
                Surface(modifier = Modifier.align(Alignment.BottomEnd).padding(8.dp), color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(8.dp)) {
                    Text("$${product.price}", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = MaterialTheme.colorScheme.onPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            Column(modifier = Modifier.padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(product.brand.uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary, letterSpacing = 1.sp)
                    Surface(color = Color(0xFFFFF8E1), shape = RoundedCornerShape(6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)) {
                            Icon(Icons.Default.Star, null, tint = Color(0xFFFFB300), modifier = Modifier.size(10.dp))
                            Text((product.rating ?: 4.8).toString(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Color(0xFF827717))
                        }
                    }
                }

                Text(product.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("AI Verified • In Stock near you", style = MaterialTheme.typography.labelSmall, color = Color(0xFF2E7D32), fontWeight = FontWeight.Medium)

                Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onSelectTryOn(product) }, modifier = Modifier.weight(1f).height(36.dp), contentPadding = PaddingValues(0.dp), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Try On", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(onClick = { onAddToCart(product) }, modifier = Modifier.weight(1f).height(36.dp), contentPadding = PaddingValues(0.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF18211E))) {
                        Icon(Icons.Default.AddShoppingCart, null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Buy Now", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

