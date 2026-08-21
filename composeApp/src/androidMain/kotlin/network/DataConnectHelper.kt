package network

import com.google.firebase.Firebase
import com.google.firebase.functions.functions
import com.spresso.dataconnect.instance
import com.spresso.dataconnect.execute
import kotlinx.coroutines.tasks.await
import java.util.UUID

actual suspend fun upsertUserPreference(theme: String?, pushNotifications: Boolean?, emailAlerts: Boolean?) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.upsertUserPreference.execute {
            this.theme = theme
            this.pushNotifications = pushNotifications
            this.emailAlerts = emailAlerts
        }
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun upsertUserProfile(email: String?, displayName: String?, avatarUrl: String?) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.upsertUserProfile.execute {
            this.email = email
            this.displayName = displayName
            this.avatarUrl = avatarUrl
        }
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun addGroceryItem(listId: String, productName: String, productId: String?, addedVia: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.addGroceryItem.execute(
            listId = java.util.UUID.fromString(listId),
            productName = productName,
            addedVia = addedVia
        ) {
            this.productId = productId
        }
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun toggleGroceryItem(id: String, isPurchased: Boolean) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.toggleGroceryItem.execute(
            id = java.util.UUID.fromString(id),
            isPurchased = isPurchased
        )
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun deleteGroceryItem(id: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.deleteGroceryItem.execute(
            id = java.util.UUID.fromString(id)
        )
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun createPaymentMethod(stripePaymentMethodId: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.createPaymentMethod.execute(
            stripePaymentMethodId = stripePaymentMethodId
        )
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun deletePaymentMethod(id: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.deletePaymentMethod.execute(
            id = java.util.UUID.fromString(id)
        )
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun updateUserSubscription(id: String, tier: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.updateUserSubscription.execute(
            id = java.util.UUID.fromString(id),
            tier = tier
        )
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun createOrder(authorizationId: String, productId: String, quantity: Int, totalAmount: Float, shippingAddress: String?, deviceSource: String, paymentMethod: String, userConfirmedToken: String?) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.createOrder.execute(
            authorizationId = authorizationId,
            productId = productId,
            quantity = quantity,
            totalAmount = totalAmount.toDouble(),
            deviceSource = deviceSource,
            paymentMethod = paymentMethod
        ) {
            this.shippingAddress = shippingAddress
            this.userConfirmedToken = userConfirmedToken
        }
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun connectCoinbaseWallet(address: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.connectCoinbaseWallet.execute(
            walletAddress = address
        )
    } catch (e: Exception) {
        throw e
    }
}

actual suspend fun registerPasskey(credentialId: String, publicKey: String) {
    try {
        com.spresso.dataconnect.SpressoConnectorConnector.instance.registerPasskey.execute(
            credentialId = credentialId,
            publicKey = publicKey
        )
    } catch (e: Exception) {
        throw e
    }
}
