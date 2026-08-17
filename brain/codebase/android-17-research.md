# Android 17 (API 37) Research: Bubbles and Screen Reactions

## 1. Bubbles API XML Configuration
In Android 17 (API 37), the Bubbles feature has evolved from being restricted to messaging apps to supporting almost any app via a universal multitasking floating window mode. To enable an activity to function as a Bubble, you must configure the `<activity>` tag in your `AndroidManifest.xml` with specific attributes:

```xml
<activity
    android:name=".YourBubbleActivity"
    android:allowEmbedded="true"
    android:resizeableActivity="true"
    android:documentLaunchMode="always"
    android:exported="true"> 
</activity>
```

**Key Attributes:**
- `android:allowEmbedded="true"`: Crucial for allowing the activity to be embedded within the System UI, making it capable of appearing as a floating bubble window.
- `android:resizeableActivity="true"`: Indicates that the activity supports multi-window environments. Note that on large screens (≥ 600dp), apps targeting API 37 cannot opt out of resizability; the system will ignore constraints and enforce windowing behavior.
- `android:documentLaunchMode="always"`: Ensures the system can create multiple instances of the activity, which is important for supporting concurrent bubbles.

## 2. Creating a Bubble with `Notification.BubbleMetadata`
Developers are encouraged to migrate from using the older `SYSTEM_ALERT_WINDOW` overlay for persistent floating UI (like live transcribers or voice assistants) to the new Bubbles multitasking environment.

To create a Bubble, you construct a `Notification.BubbleMetadata` object and attach it to a notification.

```kotlin
// 1. Create a PendingIntent for the Bubble Activity
val targetIntent = Intent(context, YourBubbleActivity::class.java)
val bubbleIntent = PendingIntent.getActivity(
    context,
    0,
    targetIntent,
    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
)

// 2. Create the Icon for the Bubble
val bubbleIcon = Icon.createWithResource(context, R.drawable.ic_bubble)

// 3. Build the BubbleMetadata
val bubbleMetadata = Notification.BubbleMetadata.Builder(bubbleIntent, bubbleIcon)
    .setDesiredHeight(600) // Height in dp
    .setAutoExpandBubble(true) // Expand automatically if needed
    .setSuppressNotification(true) // Suppress initial shade notification if expanded
    .build()

// 4. Attach to the Notification
val notification = Notification.Builder(context, CHANNEL_ID)
    .setContentTitle("Floating Assistant")
    .setContentText("Your assistant is running")
    .setSmallIcon(R.drawable.ic_notification)
    .setBubbleMetadata(bubbleMetadata)
    .build()

// 5. Notify
val notificationManager = getSystemService(NotificationManager::class.java)
notificationManager.notify(NOTIFICATION_ID, notification)
```

## 3. "Express yourself with Screen Reactions" Feature
Android 17 introduces a system-level feature called "Express yourself with Screen Reactions," enabling users to record their screen and their selfie camera feed simultaneously (picture-in-picture) without third-party editing tools.

For developers building screen recording functionality, this is exposed through the `MediaProjection` API using a configuration builder called `ScreenReactionConfig`.

**Developer Implementation:**
You can invoke this by passing a `ScreenReactionConfig` into the `MediaProjectionManager`'s screen capture intent.

```kotlin
val mediaProjectionManager = getSystemService(MediaProjectionManager::class.java)

// 1. Build the Screen Reaction Configuration
val reactionConfig = ScreenReactionConfig.Builder()
    .setPosition(ScreenReactionPosition.BOTTOM_RIGHT)
    .setShape(ScreenReactionShape.CIRCLE) // Can also be rounded rectangle etc.
    .setSize(0.25f) // Sets the selfie overlay to 25% of the recording width
    .build()

// 2. Create the intent with the configuration
val captureIntent = mediaProjectionManager.createScreenCaptureIntent(reactionConfig)

// 3. Launch the intent (e.g., using ActivityResultLauncher)
startActivityForResult(captureIntent, REQUEST_CODE)
```
*Note: This feature requires explicit runtime permissions to access the camera for the overlay. The system UI will display a persistent privacy indicator (e.g., an orange chip) when the camera overlay is active.*
