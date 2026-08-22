package components.features.catalog

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import components.models.*
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

@Composable
fun ProductPriceTag(
    price: Double,
    modifier: Modifier = Modifier,
) {
    val cents = ((price - price.toInt()) * 100).toInt()
    val centsStr = if (cents < 10) "0$cents" else "$cents"
    val formattedPrice = "$${price.toInt()}.$centsStr"

    Text(
        text = formattedPrice,
        style = MaterialTheme.typography.bodyMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = modifier,
    )
}

@Preview
@Composable
fun ProductPriceTagPreview() {
    AppTheme {
        ProductPriceTag(price = 149.99)
    }
}
