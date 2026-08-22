package com.spresso19.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryPurchasesParams
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import network.Telemetry

private const val TAG = "BillingManager"

class BillingManager(
    context: Context,
) : PurchasesUpdatedListener {
    private val _purchases = MutableStateFlow<List<Purchase>>(emptyList())
    val purchases = _purchases.asStateFlow()

    // Internal scope for billing tasks — not tied to any Activity lifecycle
    private val billingScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val billingClient: BillingClient =
        BillingClient
            .newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build()

    // Exponential backoff reconnect state
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 5

    init {
        startConnection()
    }

    private fun startConnection() {
        billingClient.startConnection(
            object : BillingClientStateListener {
                override fun onBillingSetupFinished(billingResult: BillingResult) {
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        Log.i(TAG, "Billing client setup finished successfully")
                        reconnectAttempts = 0
                        // Restore any purchases that may have completed while the app was not running
                        queryPendingPurchases()
                    } else {
                        Log.e(TAG, "Billing setup failed: ${billingResult.debugMessage} (code=${billingResult.responseCode})")
                    }
                }

                override fun onBillingServiceDisconnected() {
                    Log.w(TAG, "Billing service disconnected — scheduling reconnect (attempt $reconnectAttempts)")
                    scheduleReconnect()
                }
            },
        )
    }

    /**
     * Exponential backoff reconnect: 2^attempt * 1000ms, capped at 5 attempts.
     */
    private fun scheduleReconnect() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            Log.e(TAG, "Max reconnect attempts reached — billing unavailable")
            return
        }
        billingScope.launch {
            val delayMs = (1L shl reconnectAttempts) * 1000L
            reconnectAttempts++
            Log.i(TAG, "Reconnecting billing in ${delayMs}ms (attempt $reconnectAttempts)")
            delay(delayMs)
            startConnection()
        }
    }

    /**
     * Query existing purchases on setup to restore any acknowledged or pending states.
     * Required by Google Play policy for one-time purchases.
     */
    private fun queryPendingPurchases() {
        billingScope.launch {
            val params =
                QueryPurchasesParams
                    .newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            billingClient.queryPurchasesAsync(params) { billingResult, purchaseList ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Restored ${purchaseList.size} pending purchases")
                    _purchases.value = purchaseList
                    // Acknowledge any unacknowledged purchases restored from the store
                    purchaseList.forEach { purchase ->
                        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
                            acknowledgePurchase(purchase)
                        }
                    }
                } else {
                    Log.e(TAG, "queryPurchasesAsync failed: ${billingResult.debugMessage}")
                }
            }
        }
    }

    override fun onPurchasesUpdated(
        billingResult: BillingResult,
        purchases: MutableList<Purchase>?,
    ) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                if (purchases != null) {
                    _purchases.value = purchases
                    purchases.forEach { purchase ->
                        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
                            acknowledgePurchase(purchase)
                        }
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                Log.i(TAG, "Purchase cancelled by user")
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                Log.w(TAG, "Item already owned — restoring purchases")
                queryPendingPurchases()
            }
            else -> {
                Log.e(TAG, "Purchase update error: ${billingResult.debugMessage} (code=${billingResult.responseCode})")
                Telemetry.recordError(
                    "onPurchasesUpdated error code=${billingResult.responseCode}",
                    Exception(billingResult.debugMessage),
                )
            }
        }
    }

    /**
     * Acknowledges a purchase with Google Play.
     * Required within 3 days of purchase; unacknowledged purchases are automatically refunded.
     */
    private fun acknowledgePurchase(purchase: Purchase) {
        val params =
            AcknowledgePurchaseParams
                .newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()
        billingClient.acknowledgePurchase(params) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.i(TAG, "Purchase acknowledged: ${purchase.orderId}")
            } else {
                Log.e(TAG, "Failed to acknowledge purchase ${purchase.orderId}: ${billingResult.debugMessage}")
                Telemetry.recordError(
                    "acknowledgePurchase failed for orderId=${purchase.orderId}",
                    Exception(billingResult.debugMessage),
                )
            }
        }
    }

    fun launchBillingFlow(
        activity: Activity,
        productDetails: ProductDetails,
    ) {
        val productDetailsParamsList =
            listOf(
                BillingFlowParams.ProductDetailsParams
                    .newBuilder()
                    .setProductDetails(productDetails)
                    .build(),
            )

        val billingFlowParams =
            BillingFlowParams
                .newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .build()

        val result = billingClient.launchBillingFlow(activity, billingFlowParams)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "launchBillingFlow failed: ${result.debugMessage} (code=${result.responseCode})")
        }
    }

    /**
     * Should be called when the host is destroyed to release resources.
     */
    fun destroy() {
        billingClient.endConnection()
    }
}
