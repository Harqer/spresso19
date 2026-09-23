package components.features.profile

actual class CoinbaseWalletHelper actual constructor(
    context: Any?,
) {
    actual suspend fun connectWallet(): String = throw UnsupportedOperationException("Coinbase Wallet is not available in the browser app.")
}
