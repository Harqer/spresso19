package network

import com.google.firebase.FirebaseApp

internal object AndroidRuntimeConfig {
    private fun stringResource(name: String): String {
        val context = FirebaseApp.getInstance().applicationContext
        val resourceId = context.resources.getIdentifier(name, "string", context.packageName)
        return if (resourceId == 0) "" else context.getString(resourceId)
    }

    val googleWebClientId: String
        get() = stringResource("google_web_client_id")

    val stripePublishableKey: String
        get() = stringResource("stripe_publishable_key")
}
