package components.navigation

import components.models.*

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.PermanentDrawerSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import navigation.NavKey
import org.jetbrains.compose.resources.vectorResource
import org.jetbrains.compose.resources.painterResource
import spresso19.composeapp.generated.resources.Res
import spresso19.composeapp.generated.resources.spresso_logo_symbol_transparent
import androidx.compose.foundation.Image

@Composable
fun AdaptiveNavDrawerContent(
    currentKey: NavKey,
    onNavigate: (NavKey) -> Unit,
    modifier: Modifier = Modifier
) {
    PermanentDrawerSheet(modifier = modifier.width(260.dp)) {
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Image(
                painter = painterResource(Res.drawable.spresso_logo_symbol_transparent),
                contentDescription = "Spresso Logo",
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Spresso",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        defaultNavDestinations.forEach { item ->
            val selected = isSameDestinationGroup(currentKey, item.key)
            NavigationDrawerItem(
                label = { Text(item.label) },
                icon = {
                    if (item.icon != null) {
                        Icon(item.icon, contentDescription = item.label)
                    } else if (item.iconResource != null) {
                        Icon(vectorResource(item.iconResource), contentDescription = item.label)
                    }
                },
                selected = selected,
                onClick = { onNavigate(item.key) },
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
            )
        }
    }
}
