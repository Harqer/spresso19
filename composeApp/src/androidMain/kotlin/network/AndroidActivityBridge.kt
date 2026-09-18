package network

import android.content.Context
import android.content.Intent
import androidx.fragment.app.FragmentActivity

object AndroidActivityBridge {
    var currentActivity: FragmentActivity? = null

    const val ACTION_USER_SCREEN_CAPTURE = "com.spresso.action.USER_SCREEN_CAPTURE"
    const val EXTRA_OPEN_ACCESSIBILITY_DISCLOSURE = "open_accessibility_disclosure"

    fun mainActivityIntent(context: Context): Intent =
        requireNotNull(context.packageManager.getLaunchIntentForPackage(context.packageName)) {
            "Spresso launcher activity is not registered."
        }
}
