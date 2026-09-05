package ui

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.wallet.PaymentDataRequest
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.PaymentsClient
import com.google.android.gms.wallet.Wallet
import com.google.android.gms.wallet.WalletConstants
import network.SpressoConfig
import org.json.JSONArray
import org.json.JSONObject

private fun googlePayResult(paymentDataJson: String?): GooglePayResult {
    if (paymentDataJson.isNullOrBlank()) {
        return GooglePayResult(errorMessage = "Google Pay did not return payment details.")
    }
    return try {
        val tokenValue =
            JSONObject(paymentDataJson)
                .getJSONObject("paymentMethodData")
                .getJSONObject("tokenizationData")
                .getString("token")
        val paymentToken =
            if (tokenValue.startsWith("{")) {
                JSONObject(tokenValue).optString("id")
            } else {
                tokenValue
            }
        if (paymentToken.startsWith("pm_") || paymentToken.startsWith("tok_")) {
            GooglePayResult(paymentToken = paymentToken)
        } else {
            GooglePayResult(errorMessage = "Google Pay returned an unsupported payment reference.")
        }
    } catch (e: Exception) {
        GooglePayResult(errorMessage = "Google Pay did not return usable payment details.")
    }
}

@Composable
actual fun GooglePayButton(
    amount: String,
    enabled: Boolean,
    onResult: (GooglePayResult) -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val currentOnResult = rememberUpdatedState(onResult)
    val paymentResultLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            if (result.resultCode == Activity.RESULT_OK) {
                currentOnResult.value(
                    googlePayResult(result.data?.let { intent -> PaymentData.getFromIntent(intent)?.toJson() }),
                )
            } else {
                currentOnResult.value(GooglePayResult(errorMessage = "Google Pay was canceled."))
            }
        }
    val paymentsClient: PaymentsClient =
        remember {
            Wallet.getPaymentsClient(
                context,
                Wallet.WalletOptions
                    .Builder()
                    .setEnvironment(WalletConstants.ENVIRONMENT_PRODUCTION)
                    .build(),
            )
        }

    val stripePublishableKey = SpressoConfig.stripePublishableKey
    val isGooglePayConfigured = activity != null && stripePublishableKey.startsWith("pk_")

    Button(
        onClick = {
            if (!isGooglePayConfigured) {
                onResult(GooglePayResult(errorMessage = "Google Pay is unavailable on this device."))
                return@Button
            }
            val paymentDataRequestJson =
                JSONObject().apply {
                    put("apiVersion", 2)
                    put("apiVersionMinor", 0)
                    put(
                        "allowedPaymentMethods",
                        JSONArray().apply {
                            put(
                                JSONObject().apply {
                                    put("type", "CARD")
                                    put(
                                        "parameters",
                                        JSONObject().apply {
                                            put("allowedAuthMethods", JSONArray().put("PAN_ONLY").put("CRYPTOGRAM_3DS"))
                                            put("allowedCardNetworks", JSONArray().put("MASTERCARD").put("VISA"))
                                        },
                                    )
                                    put(
                                        "tokenizationSpecification",
                                        JSONObject().apply {
                                            put("type", "PAYMENT_GATEWAY")
                                            put(
                                                "parameters",
                                                JSONObject().apply {
                                                    put("gateway", "stripe")
                                                    put("stripe:version", "2023-10-16")
                                                    put("stripe:publishableKey", stripePublishableKey)
                                                },
                                            )
                                        },
                                    )
                                },
                            )
                        },
                    )
                    put(
                        "transactionInfo",
                        JSONObject().apply {
                            put("totalPrice", amount)
                            put("totalPriceStatus", "FINAL")
                            put("currencyCode", "USD")
                        },
                    )
                    put(
                        "merchantInfo",
                        JSONObject().apply {
                            put("merchantName", "Spresso Commerce")
                        },
                    )
                }

            val request = PaymentDataRequest.fromJson(paymentDataRequestJson.toString())
            paymentsClient.loadPaymentData(request).addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    currentOnResult.value(googlePayResult(task.result?.toJson()))
                } else {
                    val resolution = task.exception as? com.google.android.gms.common.api.ResolvableApiException
                    if (resolution == null) {
                        currentOnResult.value(GooglePayResult(errorMessage = "Google Pay was not completed."))
                    } else {
                        paymentResultLauncher.launch(IntentSenderRequest.Builder(resolution.resolution).build())
                    }
                }
            }
        },
        enabled = enabled && isGooglePayConfigured,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
    ) {
        Icon(Icons.Default.ShoppingBag, null, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            if (isGooglePayConfigured) "Pay with Google Pay — $$amount" else "Google Pay unavailable",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
actual fun GoogleWalletSaveButton(
    passId: String,
    modifier: Modifier,
) {
    val context = LocalContext.current

    Button(
        onClick = {
            try {
                val intent =
                    android.content.Intent(
                        android.content.Intent.ACTION_VIEW,
                        android.net.Uri.parse("https://pay.google.com/gp/v/save/$passId"),
                    )
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            } catch (e: android.content.ActivityNotFoundException) {
                network.Telemetry.recordError("Google Wallet not found or unable to handle link", e)
            } catch (e: Exception) {
                network.Telemetry.recordError("Failed to open Google Wallet", e)
            }
        },
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        colors =
            ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.onSurface,
                contentColor = MaterialTheme.colorScheme.surface,
            ),
    ) {
        Icon(Icons.Default.AccountBalanceWallet, null, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text("Save to Google Wallet", fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}
