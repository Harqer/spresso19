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
import network.SpressoConfig // Ensure your app's main activity is launched

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
        // In a production app, we would sync this token with the backend 
        // to associate it with the current user's UID for targeted messaging.
        println("FCM Token refreshed: $token")
    }

    private fun sendNotification(title: String, messageBody: String, itemId: String?) {
        // Normally, this intent targets your MainActivity to handle the deep link
        // val intent = Intent(this, MainActivity::class.java).apply {
        //     addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        //     putExtra("item_id", itemId)
        // }
        // val pendingIntent = PendingIntent.getActivity(this, 0, intent,
        //     PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        val channelId = "spresso_retention_channel"
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            // .setSmallIcon(R.drawable.ic_notification) // Placeholder for actual icon
            .setContentTitle(title)
            .setContentText(messageBody)
            .setAutoCancel(true)
            // .setContentIntent(pendingIntent)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Since Android Oreo, notification channels are required
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Recommendations",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(0, notificationBuilder.build())
    }
}
