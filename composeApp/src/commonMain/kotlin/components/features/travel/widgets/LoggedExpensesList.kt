package components.features.travel.widgets

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.models.TravelExpense

@Composable
fun LoggedExpensesList(
    tripExpenses: List<TravelExpense>,
    modifier: Modifier = Modifier,
) {
    var showAll by remember { mutableStateOf(false) }
    val displayList = if (showAll) tripExpenses else tripExpenses.take(5)

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "LOGGED EXPENSES",
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.semantics { heading() },
        )

        if (tripExpenses.isEmpty()) {
            Text(
                text = "No expenses logged yet. Scan a receipt or add manually.",
                style = MaterialTheme.typography.bodySmall,
                fontStyle = FontStyle.Italic,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                displayList.forEach { exp ->
                    key(exp.id) {
                        LoggedExpenseItem(exp = exp)
                    }
                }
            }

            if (tripExpenses.size > 5 && !showAll) {
                TextButton(
                    onClick = { showAll = true },
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text(
                        text = "View All (\${tripExpenses.size})",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                    )
                }
            }
        }
    }
}
