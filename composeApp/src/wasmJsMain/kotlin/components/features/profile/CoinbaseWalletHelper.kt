package components.features.profile

actual class CoinbaseWalletHelper actual constructor(
) {
    actual suspend fun connectWallet(): String = "wasm-coinbase-wallet"
}
