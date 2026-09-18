package network

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SpressoMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.notification?.title ?: "Spresso"
        val body = remoteMessage.notification?.body ?: "You have a new recommendation!"
        val itemId = remoteMessage.data["item_id"]

        sendNotification(title, body, itemId)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(TOKEN_KEY, token)
            .apply()
    }

    private fun sendNotification(
        title: String,
        messageBody: String,
        itemId: String?,
    ) {
        val intent =
            AndroidActivityBridge.mainActivityIntent(this).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                if (itemId != null) putExtra("item_id", itemId)
            }
        val pendingIntent =
            PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )

        val channelId = "spresso_retention_channel"
        val notificationBuilder =
            NotificationCompat
                .Builder(this, channelId)
                .setSmallIcon(resources.getIdentifier("logo_icon", "drawable", packageName))
                .setContentTitle(title)
                .setContentText(messageBody)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Since Android Oreo, notification channels are required
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel =
                NotificationChannel(
                    channelId,
                    "Recommendations",
                    NotificationManager.IMPORTANCE_DEFAULT,
                )
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(0, notificationBuilder.build())
    }

    companion object {
        private const val PREFERENCES_NAME = "spresso_fcm_prefs"
        private const val TOKEN_KEY = "fcm_token"
    }
}
