package components.features.profile

expect class CoinbaseWalletHelper(context: Any?) {
    suspend fun connectWallet(): String
}
