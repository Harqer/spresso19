package components.features.profile

import android.content.Context
import android.net.Uri
import com.coinbase.android.nativesdk.CoinbaseWalletSDK
import com.coinbase.android.nativesdk.message.request.Action
import com.coinbase.android.nativesdk.message.request.Web3JsonRPC

actual class CoinbaseWalletHelper actual constructor(private val context: Any?) {
    actual suspend fun connectWallet(): String {
        if (context is Context) {
            val client = CoinbaseWalletSDK(
                appContext = context,
                domain = Uri.parse(network.SpressoConfig.backendBaseUrl),
                openIntent = { intent -> context.startActivity(intent) }
            )
            client.initiateHandshake(
                initialActions = listOf(Action(rpc = Web3JsonRPC.RequestAccounts()))
            ) { _, _ -> }
            throw IllegalStateException("Wallet connection initiated, awaiting result in activity")
        } else {
            throw IllegalStateException("Feature under development: Coinbase Wallet SDK requires Context injection")
        }
    }
}
