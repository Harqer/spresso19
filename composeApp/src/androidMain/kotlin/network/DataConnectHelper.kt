package network

import com.spresso.dataconnect.execute
import com.spresso.dataconnect.instance
import java.util.UUID

actual suspend fun upsertUserPreference(
    theme: String?,
    pushNotifications: Boolean?,
    emailAlerts: Boolean?,
) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.upsertUserPreference.execute {
        this.theme = theme
        this.pushNotifications = pushNotifications
        this.emailAlerts = emailAlerts
    }
}

actual suspend fun upsertUserProfile(
    email: String?,
    displayName: String?,
    avatarUrl: String?,
) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.upsertUserProfile.execute {
        this.email = email
        this.displayName = displayName
        this.avatarUrl = avatarUrl
    }
}

actual suspend fun addGroceryItem(
    listId: String,
    productName: String,
    productId: String?,
    addedVia: String,
) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.addGroceryItem.execute(
        listId = java.util.UUID.fromString(listId),
        productName = productName,
        addedVia = addedVia,
    ) {
        this.productId = productId
    }
}

actual suspend fun toggleGroceryItem(
    id: String,
    isPurchased: Boolean,
) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.toggleGroceryItem.execute(
        id = java.util.UUID.fromString(id),
        isPurchased = isPurchased,
    )
}

actual suspend fun deleteGroceryItem(id: String) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.deleteGroceryItem.execute(
        id = java.util.UUID.fromString(id),
    )
}

actual suspend fun createPaymentMethod(stripePaymentMethodId: String) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.createPaymentMethod.execute(
        stripePaymentMethodId = stripePaymentMethodId,
    )
}

actual suspend fun deletePaymentMethod(id: String) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.deletePaymentMethod.execute(
        id = java.util.UUID.fromString(id),
    )
}

actual suspend fun updateUserSubscription(
    id: String,
    tier: String,
) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.upsertUserSubscription.execute(
        tier = tier,
    )
}

actual suspend fun createOrder(
    authorizationId: String,
    productId: String,
    quantity: Int,
    totalAmount: Float,
    shippingAddress: String?,
    deviceSource: String,
    paymentMethod: String,
    userConfirmedToken: String?,
) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.createOrder.execute(
        authorizationId = authorizationId,
        productId = productId,
        quantity = quantity,
        totalAmount = totalAmount.toDouble(),
        deviceSource = deviceSource,
        paymentMethod = paymentMethod,
    ) {
        this.shippingAddress = shippingAddress
        this.userConfirmedToken = userConfirmedToken
    }
}

actual suspend fun connectCoinbaseWallet(address: String) {
    com.spresso.dataconnect.SpressoConnectorConnector.instance.connectCoinbaseWallet.execute(
        walletAddress = address,
    )
}
