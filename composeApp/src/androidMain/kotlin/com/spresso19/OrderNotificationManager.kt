package com.spresso19

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.graphics.drawable.IconCompat

object OrderNotificationManager {
    const val CHANNEL_ID = "order_reminders"
    const val CHANNEL_NAME = "AI Order & Delivery Reminders"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply {
                    description = "Automated AI delivery status updates and order reminders"
                }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun showOrderReminderNotification(
        context: Context,
        orderId: String,
        title: String,
        message: String,
    ) {
        createNotificationChannel(context)

        val intent =
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("order_id", orderId)
            }

        val pendingIntent =
            PendingIntent.getActivity(
                context,
                orderId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

        val bubbleMetadata =
            NotificationCompat.BubbleMetadata
                .Builder(
                    pendingIntent,
                    IconCompat.createWithResource(context, android.R.drawable.ic_dialog_info),
                ).setDesiredHeight(600)
                .build()

        val builder =
            NotificationCompat
                .Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setBubbleMetadata(bubbleMetadata)
                .setAutoCancel(true)

        try {
            val notificationManager = NotificationManagerCompat.from(context)
            notificationManager.notify(orderId.hashCode(), builder.build())
        } catch (e: SecurityException) {
            // Android 13+ POST_NOTIFICATIONS permission not granted
        }
    }

    fun showDelayNotification(
        context: Context,
        orderId: String,
        title: String,
        message: String,
        newDeliveryDate: String,
    ) {
        createNotificationChannel(context)

        val intent =
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("order_id", orderId)
                putExtra("action", "view_delay")
            }

        val pendingIntent =
            PendingIntent.getActivity(
                context,
                orderId.hashCode() + 1,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

        val bubbleMetadata =
            NotificationCompat.BubbleMetadata
                .Builder(
                    pendingIntent,
                    IconCompat.createWithResource(context, android.R.drawable.ic_dialog_info),
                ).setDesiredHeight(600)
                .build()

        val builder =
            NotificationCompat
                .Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText("$message (Expected: $newDeliveryDate)")
                .setStyle(NotificationCompat.BigTextStyle().bigText("$message\nNew Expected Delivery: $newDeliveryDate"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setBubbleMetadata(bubbleMetadata)
                .setAutoCancel(true)

        try {
            val notificationManager = NotificationManagerCompat.from(context)
            notificationManager.notify(orderId.hashCode() + 1, builder.build())
        } catch (e: SecurityException) {
            // Android 13+ POST_NOTIFICATIONS permission not granted
        }
    }

    fun showInteractiveArrivalNotification(
        context: Context,
        orderId: String,
        title: String,
        message: String,
    ) {
        createNotificationChannel(context)

        val intent =
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("order_id", orderId)
            }
        val pendingIntent =
            PendingIntent.getActivity(
                context,
                orderId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

        val bubbleMetadata =
            NotificationCompat.BubbleMetadata
                .Builder(
                    pendingIntent,
                    IconCompat.createWithResource(context, android.R.drawable.ic_dialog_info),
                ).setDesiredHeight(600)
                .build()

        // "Yes" action
        val yesIntent =
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("order_id", orderId)
                putExtra("arrival_status", "yes")
            }
        val yesPendingIntent =
            PendingIntent.getActivity(
                context,
                orderId.hashCode() + 2,
                yesIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

        // "No" action
        val noIntent =
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("order_id", orderId)
                putExtra("arrival_status", "no")
            }
        val noPendingIntent =
            PendingIntent.getActivity(
                context,
                orderId.hashCode() + 3,
                noIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

        val builder =
            NotificationCompat
                .Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setBubbleMetadata(bubbleMetadata)
                .addAction(android.R.drawable.ic_menu_send, "Yes, received it", yesPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "No, still waiting", noPendingIntent)
                .setAutoCancel(true)

        try {
            val notificationManager = NotificationManagerCompat.from(context)
            notificationManager.notify(orderId.hashCode() + 4, builder.build())
        } catch (e: SecurityException) {
            // Android 13+ POST_NOTIFICATIONS permission not granted
        }
    }
}
