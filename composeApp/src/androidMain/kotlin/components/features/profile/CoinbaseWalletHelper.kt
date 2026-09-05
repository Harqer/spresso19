package components.features.profile

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.coinbase.android.nativesdk.CoinbaseWalletSDK
import com.coinbase.android.nativesdk.message.request.Web3JsonRPC
import com.spresso.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import network.ApiClient
import kotlin.coroutines.resume

object CoinbaseWalletManager {
    private const val WALLET_PACKAGE = "org.toshi"
    private const val CALLBACK_SCHEME = "spresso"
    private const val CALLBACK_HOST = "coinbase-wallet-sdk"
    const val CALLBACK_URL = "$CALLBACK_SCHEME://$CALLBACK_HOST"

    private var pendingCallback: ((Boolean, String?) -> Unit)? = null
    private var pendingApiClient: ApiClient? = null
    private var sdk: CoinbaseWalletSDK? = null

    suspend fun connectWallet(activity: Activity?): String =
        withContext(Dispatchers.Main) {
            suspendCancellableCoroutine { continuation ->
                connect(activity, onResult = { success, address ->
                    if (success && !address.isNullOrBlank()) {
                        continuation.resume(address)
                    } else if (continuation.isActive) {
                        continuation.resume("")
                    }
                })
                continuation.invokeOnCancellation {
                    pendingCallback = null
                    pendingApiClient = null
                }
            }
        }

    /**
     * Initiates the handshake connection with Coinbase Wallet.
     * Uses the active Activity from MainActivity.currentActivity or the passed activity.
     */
    fun connect(
        activity: Activity? = null,
        apiClient: ApiClient? = null,
        onResult: ((Boolean, String?) -> Unit)? = null,
    ) {
        val targetActivity = activity ?: MainActivity.currentActivity
        if (targetActivity == null) {
            onResult?.invoke(false, "No active Activity found to connect Coinbase Wallet")
            return
        }

        try {
            pendingCallback = onResult
            pendingApiClient = apiClient
            val client = CoinbaseWalletSDK(
                Uri.parse(CALLBACK_URL),
                targetActivity.applicationContext,
                "Spresso",
            ) { intent -> targetActivity.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            sdk = client
            val requestAccounts = Web3JsonRPC.RequestAccounts().action(false)
            client.initiateHandshake(listOf(requestAccounts)) { result, account ->
                result.fold(
                    onSuccess = {
                        val address = account?.address
                        val callback = pendingCallback
                        val connectedClient = pendingApiClient
                        pendingCallback = null
                        pendingApiClient = null
                        if (address.isNullOrBlank()) {
                            callback?.invoke(false, "Coinbase Wallet returned no account")
                        } else {
                            CoroutineScope(Dispatchers.IO).launch {
                                val serverConnected = connectedClient?.connectCoinbaseWallet(address) ?: true
                                withContext(Dispatchers.Main) { callback?.invoke(serverConnected, address) }
                            }
                        }
                    },
                    onFailure = { error ->
                        val callback = pendingCallback
                        pendingCallback = null
                        pendingApiClient = null
                        callback?.invoke(false, error.message)
                    },
                )
            }
        } catch (e: Exception) {
            val callback = pendingCallback
            pendingCallback = null
            pendingApiClient = null
            callback?.invoke(false, e.message ?: "Failed to launch Coinbase Wallet")
        }
    }

    /**
     * Processes incoming deep link URIs from Coinbase Wallet.
     * Returns true if the URI was handled as a Coinbase Wallet callback.
     */
    fun handleResponse(uri: Uri?): Boolean {
        if (uri == null) return false
        return sdk?.handleResponse(uri) == true
    }

    /**
     * Handles an incoming Intent for the Coinbase Wallet response.
     */
    fun handleResponse(intent: Intent?): Boolean = handleResponse(intent?.data)
}

actual class CoinbaseWalletHelper actual constructor(
    private val context: Any?,
) {
    actual suspend fun connectWallet(): String {
        val activity = (context as? Activity) ?: MainActivity.currentActivity
        return CoinbaseWalletManager.connectWallet(activity)
    }
}
