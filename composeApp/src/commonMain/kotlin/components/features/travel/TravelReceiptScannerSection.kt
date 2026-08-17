package components.features.travel

import components.models.*
import components.features.travel.widgets.AddExpenseForm
import components.features.travel.widgets.LoggedExpenseItem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


@OptIn(kotlin.io.encoding.ExperimentalEncodingApi::class)
@Composable
fun ReceiptScannerSection(
    activeTripId: String,
    tripExpenses: List<TravelExpense>,
    onAddExpense: (TravelExpense) -> Unit
) {
    val scope = rememberCoroutineScope()
    var isScanningReceipt by remember { mutableStateOf(false) }

    var newExpenseMerchant by remember { mutableStateOf("") }
    var newExpenseAmount by remember { mutableStateOf("") }
    var newExpenseCategory by remember { mutableStateOf("Dining") }

    val receiptScanner = ui.rememberReceiptScanner(
        onResult = { merchant, amount ->
            newExpenseMerchant = merchant
            newExpenseAmount = amount
            isScanningReceipt = false
        },
        onError = { error ->
            newExpenseMerchant = "Error scanning: $error"
            newExpenseAmount = "0.0"
            isScanningReceipt = false
        }
    )

    val imagePicker = ui.rememberImagePicker { bytes ->
        if (bytes != null) {
            isScanningReceipt = true
            receiptScanner(bytes)
        } else {
            isScanningReceipt = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerLowest)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Automated Receipt Parser",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Row(
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(50))
                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(50))
                        .clickable { imagePicker() }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = if (isScanningReceipt) Icons.Default.Sync else Icons.Default.DocumentScanner,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = if (isScanningReceipt) "Parsing Receipt..." else "Scan Receipt",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            AddExpenseForm(
                newExpenseMerchant = newExpenseMerchant,
                onMerchantChange = { newExpenseMerchant = it },
                newExpenseAmount = newExpenseAmount,
                onAmountChange = { newExpenseAmount = it },
                newExpenseCategory = newExpenseCategory,
                onCategoryChange = { newExpenseCategory = it },
                onAddExpense = {
                    if (newExpenseMerchant.isNotBlank() && newExpenseAmount.isNotBlank()) {
                        val amt = newExpenseAmount.toDoubleOrNull() ?: 0.0
                        val item = TravelExpense(
                            id = "exp-${kotlin.random.Random.nextInt()}",
                            tripId = activeTripId,
                            amount = amt,
                            currency = "USD",
                            category = newExpenseCategory,
                            merchant = newExpenseMerchant,
                            date = "Today"
                        )
                        onAddExpense(item)
                        newExpenseMerchant = ""
                        newExpenseAmount = ""
                    }
                }
            )

            val outlineVariantColor = MaterialTheme.colorScheme.outlineVariant
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        val strokeWidth = 1.dp.toPx()
                        drawLine(
                            color = outlineVariantColor,
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = strokeWidth
                        )
                    }
                    .padding(top = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "LOGGED EXPENSES",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                tripExpenses.forEach { exp ->
                    LoggedExpenseItem(exp = exp)
                }
            }
        }
    }
}

