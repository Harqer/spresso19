package com.spresso19.engage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import com.google.android.engage.service.BroadcastReceiverPermissions

class EngageBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent == null || context == null) return
        when (intent.action) {
            "com.google.android.engage.action.PUBLISH_RECOMMENDATION" ->
                EngagePublisher.publishOneTime(context, Constants.PUBLISH_TYPE_RECOMMENDATIONS)
            "com.google.android.engage.action.PUBLISH_FEATURED" ->
                EngagePublisher.publishOneTime(context, Constants.PUBLISH_TYPE_FEATURED)
            "com.google.android.engage.action.shopping.PUBLISH_SHOPPING_CART" ->
                EngagePublisher.publishOneTime(context, Constants.PUBLISH_TYPE_SHOPPING_CART)
            "com.google.android.engage.action.shopping.PUBLISH_SHOPPING_LIST" ->
                EngagePublisher.publishOneTime(context, Constants.PUBLISH_TYPE_SHOPPING_LIST)
            "com.google.android.engage.action.shopping.PUBLISH_REORDER_CLUSTER" ->
                EngagePublisher.publishOneTime(context, Constants.PUBLISH_TYPE_SHOPPING_REORDER)
            "com.google.android.engage.action.shopping.PUBLISH_ORDER_TRACKING_CLUSTER" ->
                EngagePublisher.publishOneTime(context, Constants.PUBLISH_TYPE_SHOPPING_ORDER_TRACKING)
        }
    }

    companion object {
        fun register(context: Context) {
            val appContext = context.applicationContext
            val receiver = EngageBroadcastReceiver()

            val filter = IntentFilter().apply {
                addAction("com.google.android.engage.action.PUBLISH_RECOMMENDATION")
                addAction("com.google.android.engage.action.PUBLISH_FEATURED")
                addAction("com.google.android.engage.action.shopping.PUBLISH_SHOPPING_CART")
                addAction("com.google.android.engage.action.shopping.PUBLISH_SHOPPING_LIST")
                addAction("com.google.android.engage.action.shopping.PUBLISH_REORDER_CLUSTER")
                addAction("com.google.android.engage.action.shopping.PUBLISH_ORDER_TRACKING_CLUSTER")
            }
            ContextCompat.registerReceiver(
                appContext,
                receiver,
                filter,
                BroadcastReceiverPermissions.BROADCAST_REQUEST_DATA_PUBLISH_PERMISSION,
                null,
                ContextCompat.RECEIVER_EXPORTED
            )
        }
    }
}
