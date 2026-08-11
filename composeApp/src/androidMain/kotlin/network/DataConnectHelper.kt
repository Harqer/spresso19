package network

import com.spresso.dataconnect.SpressoConnectorConnector
import com.spresso.dataconnect.instance
import com.spresso.dataconnect.execute

import java.util.UUID

actual suspend fun toggleLike(productId: String, userUid: String) {
    try {
        SpressoConnectorConnector.instance.toggleLike.execute(
            productId = productId
        )
    } catch (e: Exception) {
        // Errors are surfaced to the UI caller via the thrown exception;
        // Crashlytics will capture non-fatal exceptions in production.
        throw e
    }
}
