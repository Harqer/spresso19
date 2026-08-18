package components.features.profile

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.spresso19.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import network.ApiClient

/**
 * CoinbaseWalletHelper manages the Mobile Wallet Protocol connection and handshake
 * for Coinbase Wallet on Android without throwing IllegalStateException.
 */
object CoinbaseWalletHelper {

    private const val WALLET_PACKAGE = "org.toshi"
    private const val CALLBACK_SCHEME = "spresso"
    private const val CALLBACK_HOST = "coinbase-wallet-sdk"
    const val CALLBACK_URL = "$CALLBACK_SCHEME://$CALLBACK_HOST"

    private var pendingCallback: ((Boolean, String?) -> Unit)? = null
    private var pendingApiClient: ApiClient? = null

    /**
     * Initiates the handshake connection with Coinbase Wallet.
     * Uses the active Activity from MainActivity.currentActivity or the passed activity.
     */
    fun connect(
        activity: Activity? = null,
        apiClient: ApiClient? = null,
        onResult: ((Boolean, String?) -> Unit)? = null
    ) {
        val targetActivity = activity ?: MainActivity.currentActivity
        if (targetActivity == null) {
            onResult?.invoke(false, "No active Activity found to connect Coinbase Wallet")
            return
        }

        pendingCallback = onResult
        pendingApiClient = apiClient

        try {
            // Build the Mobile Wallet Protocol Handshake URI
            val handshakeUri = Uri.Builder()
                .scheme("cbwallet")
                .authority("w")
                .appendPath("handshake")
                .appendQueryParameter("dapp_name", "Spresso")
                .appendQueryParameter("callback_url", CALLBACK_URL)
                .appendQueryParameter("chain_id", "8453") // Base Mainnet
                .build()

            val intent = Intent(Intent.ACTION_VIEW, handshakeUri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            // Check if Coinbase Wallet app is installed
            val packageManager = targetActivity.packageManager
            val activities = packageManager.queryIntentActivities(intent, 0)
            if (activities.isNotEmpty()) {
                intent.setPackage(WALLET_PACKAGE)
                targetActivity.startActivity(intent)
            } else {
                // Fallback: Open web connection or redirect to Play Store for Coinbase Wallet
                val webConnectUri = Uri.parse("https://go.cb-w.com/dapp?cb_url=${Uri.encode(CALLBACK_URL)}")
                val webIntent = Intent(Intent.ACTION_VIEW, webConnectUri)
                try {
                    targetActivity.startActivity(webIntent)
                } catch (e: Exception) {
                    val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$WALLET_PACKAGE"))
                    targetActivity.startActivity(marketIntent)
                }
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

        val scheme = uri.scheme
        val host = uri.host

        // Check if the URI matches our registered callback scheme/host or contains wallet response parameters
        val isCallback = (scheme == CALLBACK_SCHEME && (host == CALLBACK_HOST || host == "callback" || host == null)) ||
                uri.toString().startsWith(CALLBACK_URL)

        val hasWalletParams = uri.getQueryParameter("address") != null ||
                uri.getQueryParameter("account") != null ||
                uri.getQueryParameter("result") != null ||
                uri.getQueryParameter("error") != null

        if (!isCallback && !hasWalletParams) {
            return false
        }

        val error = uri.getQueryParameter("error") ?: uri.getQueryParameter("errorMessage")
        if (error != null) {
            val callback = pendingCallback
            pendingCallback = null
            pendingApiClient = null
            callback?.invoke(false, error)
            return true
        }

        val address = uri.getQueryParameter("address")
            ?: uri.getQueryParameter("account")
            ?: uri.getQueryParameter("result")
            ?: uri.fragment?.takeIf { it.startsWith("0x") }

        if (address != null && address.isNotBlank()) {
            val callback = pendingCallback
            val client = pendingApiClient
            pendingCallback = null
            pendingApiClient = null

            CoroutineScope(Dispatchers.IO).launch {
                val serverConnected = client?.connectCoinbaseWallet(address) ?: true
                withContext(Dispatchers.Main) {
                    callback?.invoke(serverConnected, address)
                }
            }
            return true
        }

        return false
    }

    /**
     * Handles an incoming Intent for the Coinbase Wallet response.
     */
    fun handleResponse(intent: Intent?): Boolean {
        return handleResponse(intent?.data)
    }
}
