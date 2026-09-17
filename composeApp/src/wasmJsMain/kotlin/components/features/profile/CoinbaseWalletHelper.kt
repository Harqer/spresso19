package components.features.profile

actual class CoinbaseWalletHelper actual constructor(
    context: Any?,
) {
    actual suspend fun connectWallet(): String = "wasm-coinbase-wallet"
}
