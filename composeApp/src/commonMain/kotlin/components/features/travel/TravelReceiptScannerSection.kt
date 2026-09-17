package components.features.travel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.features.travel.widgets.AddExpenseForm
import components.features.travel.widgets.LoggedExpensesList
import components.models.TravelExpense
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import ui.rememberImagePicker
import ui.rememberReceiptScanner
import utils.PlatformUtils

@OptIn(kotlin.io.encoding.ExperimentalEncodingApi::class)
@Composable
fun ReceiptScannerSection(
    activeTripId: String,
    tripExpenses: List<TravelExpense>,
    onAddExpense: (TravelExpense) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    var isScanningReceipt by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    var newExpenseMerchant by remember { mutableStateOf("") }
    var newExpenseAmount by remember { mutableStateOf("") }
    var newExpenseCategory by remember { mutableStateOf("Dining") }

    val receiptScanner =
        rememberReceiptScanner(
            onResult = { merchant, amount ->
                newExpenseMerchant = merchant
                newExpenseAmount = amount
                isScanningReceipt = false
                errorMessage = null
            },
            onError = { error ->
                isScanningReceipt = false
                errorMessage = "Error scanning receipt: \$error"
            },
        )

    val imagePicker =
        rememberImagePicker { bytes ->
            if (bytes != null) {
                isScanningReceipt = true
                errorMessage = null
                // Production: Dispatch to IO thread via scope
                scope.launch(Dispatchers.Default) {
                    receiptScanner(bytes)
                }
            } else {
                isScanningReceipt = false
            }
        }

    Box(
        modifier =
            modifier
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
                    text = "Automated Receipt Parser",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                )

                Button(
                    onClick = imagePicker,
                    enabled = !isScanningReceipt,
                    shape = RoundedCornerShape(50),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    colors =
                        ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainer,
                            contentColor = MaterialTheme.colorScheme.primary,
                        ),
                ) {
                    Icon(
                        imageVector = if (isScanningReceipt) Icons.Default.Sync else Icons.Default.DocumentScanner,
                        contentDescription = if (isScanningReceipt) "Scanning in progress" else "Open camera to scan receipt",
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (isScanningReceipt) "Parsing..." else "Scan Receipt",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    )
                }
            }

            errorMessage?.let { msg ->
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            AddExpenseForm(
                newExpenseMerchant = newExpenseMerchant,
                onMerchantChange = { newExpenseMerchant = it },
                newExpenseAmount = newExpenseAmount,
                onAmountChange = { newExpenseAmount = it },
                newExpenseCategory = newExpenseCategory,
                onCategoryChange = { newExpenseCategory = it },
                onAddExpense = {
                    val amt = newExpenseAmount.toDoubleOrNull()
                    if (newExpenseMerchant.isNotBlank() && amt != null) {
                        val item =
                            TravelExpense(
                                id = PlatformUtils.generateUUID(),
                                tripId = activeTripId,
                                amount = amt,
                                currency = "USD", // Production: Should dynamically resolve locale/trip currency
                                category = newExpenseCategory,
                                merchant = newExpenseMerchant,
                                date = Clock.System.now().toString(),
                            )
                        onAddExpense(item)
                        newExpenseMerchant = ""
                        newExpenseAmount = ""
                        errorMessage = null
                    } else {
                        errorMessage = "Please enter a valid merchant and amount."
                    }
                },
            )

            LoggedExpensesList(tripExpenses = tripExpenses)
        }
    }
}
