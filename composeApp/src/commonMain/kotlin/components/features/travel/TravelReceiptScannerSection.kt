package components.features.travel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.features.travel.widgets.AddExpenseForm
import components.models.*

data class TravelExpenseDraft(
    val amount: Double,
    val currency: String,
    val category: String,
    val merchant: String,
)

@OptIn(kotlin.io.encoding.ExperimentalEncodingApi::class)
@Composable
fun ReceiptScannerSection(
    activeTripId: String,
    tripExpenses: List<TravelExpense>,
    onAddExpense: (TravelExpenseDraft) -> Unit,
) {
    var isScanningReceipt by remember { mutableStateOf(false) }
    var scannerError by remember { mutableStateOf<String?>(null) }

    var newExpenseMerchant by remember { mutableStateOf("") }
    var newExpenseAmount by remember { mutableStateOf("") }
    var newExpenseCategory by remember { mutableStateOf("Dining") }

    val receiptScanner =
        ui.rememberReceiptScanner(
            onResult = { merchant, amount ->
                newExpenseMerchant = merchant
                newExpenseAmount = amount
                isScanningReceipt = false
            },
            onError = { error ->
                scannerError = "Unable to read this receipt. You can enter the details manually."
                isScanningReceipt = false
            },
        )

    val imagePicker =
        ui.rememberImagePicker { bytes ->
            if (bytes != null) {
                isScanningReceipt = true
                receiptScanner(bytes)
            } else {
                isScanningReceipt = false
            }
        }

    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerLowest)
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(24.dp))
                .padding(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Receipt scanner",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                OutlinedButton(onClick = { imagePicker() }, shape = RoundedCornerShape(8.dp)) {
                    Icon(
                        imageVector = if (isScanningReceipt) Icons.Default.Sync else Icons.Default.DocumentScanner,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = if (isScanningReceipt) "Reading receipt" else "Scan receipt",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }

            scannerError?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
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
                        val amount = newExpenseAmount.toDoubleOrNull()
                        if (amount == null || amount <= 0.0) {
                            scannerError = "Enter a valid expense amount."
                            return@AddExpenseForm
                        }
                        onAddExpense(
                            TravelExpenseDraft(
                                amount = amount,
                                currency = "USD",
                                category = newExpenseCategory,
                                merchant = newExpenseMerchant.trim(),
                            ),
                        )
                        newExpenseMerchant = ""
                        newExpenseAmount = ""
                        scannerError = null
                    }
                },
            )

            components.features.travel.widgets
                .LoggedExpensesList(tripExpenses = tripExpenses)
        }
    }
}
