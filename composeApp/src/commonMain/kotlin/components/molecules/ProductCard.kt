package components.molecules

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.atoms.NetworkImage
import components.pages.toPriceString
import io.ktor.client.HttpClient
import network.ProductItem

@Composable
fun ProductCard(
    product: ProductItem, client: HttpClient, onProductClick: () -> Unit,
    onTryOnClick: () -> Unit, onAddToCartClick: (() -> Unit)? = null, modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth().clickable(onClick = onProductClick),
        shape = RoundedCornerShape(18.dp), color = Color.White,
        border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFD8EBD7)), shadowElevation = 1.dp
    ) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().height(160.dp)) {
                NetworkImage(url = product.imageUrl, client = client, contentDescription = product.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                Surface(modifier = Modifier.align(Alignment.TopEnd).padding(8.dp), color = Color.Black.copy(alpha = 0.6f), shape = RoundedCornerShape(6.dp)) {
                    Row(modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Icon(Icons.Default.Star, null, tint = Color(0xFFFFB300), modifier = Modifier.size(10.dp))
                        Text(text = (product.rating ?: 4.8).toString(), color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(product.brand.uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = Color(0xFF386633), letterSpacing = 0.5.sp)
                Text(product.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Color(0xFF18211E))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("$${product.price.toPriceString()}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Black, color = Color(0xFF18211E))
                    Text("In Stock", fontSize = 9.sp, color = Color(0xFF386633), fontWeight = FontWeight.Bold)
                }

                Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedButton(onClick = onTryOnClick, modifier = Modifier.weight(1f).height(32.dp), contentPadding = PaddingValues(0.dp), shape = RoundedCornerShape(8.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD8EBD7))) {
                        Text("Try On", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    if (onAddToCartClick != null) {
                        Button(onClick = onAddToCartClick, modifier = Modifier.weight(1f).height(32.dp), contentPadding = PaddingValues(0.dp), shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633))) {
                            Icon(Icons.Default.AddShoppingCart, null, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Buy", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

