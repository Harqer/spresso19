package components.features.profile

import android.net.Uri
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
class CoinbaseWalletHelperTest {

    @Test
    fun connectWithoutActivityDoesNotThrowIllegalStateException() {
        var errorMsg: String? = null
        var successResult: Boolean? = null

        CoinbaseWalletHelper.connect(activity = null, apiClient = null) { success, msg ->
            successResult = success
            errorMsg = msg
        }

        assertEquals(false, successResult)
        assertTrue(errorMsg?.contains("No active Activity found") == true)
    }

    @Test
    fun handleResponseWithNullReturnsFalse() {
        val handled = CoinbaseWalletHelper.handleResponse(null as Uri?)
        assertFalse(handled)
    }

    @Test
    fun handleResponseWithUnrelatedUriReturnsFalse() {
        val uri = Uri.parse("https://example.com/unrelated/path")
        val handled = CoinbaseWalletHelper.handleResponse(uri)
        assertFalse(handled)
    }

    @Test
    fun handleResponseWithErrorParameterHandlesAndSignalsFailure() {
        var callbackSuccess: Boolean? = null
        var callbackMsg: String? = null

        CoinbaseWalletHelper.connect(activity = null, apiClient = null) { success, msg ->
            callbackSuccess = success
            callbackMsg = msg
        }

        val errorUri = Uri.parse("spresso://coinbase-wallet-sdk?error=UserRejectedRequest")
        val handled = CoinbaseWalletHelper.handleResponse(errorUri)

        assertTrue(handled)
        assertEquals(false, callbackSuccess)
        assertEquals("UserRejectedRequest", callbackMsg)
    }

    @Test
    fun handleResponseWithValidAddressReturnsTrue() {
        val validUri = Uri.parse("spresso://coinbase-wallet-sdk?address=0x1234567890123456789012345678901234567890")
        val handled = CoinbaseWalletHelper.handleResponse(validUri)
        assertTrue(handled)
    }
}
