package com.spresso19

import androidx.compose.material3.Text
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.activity.ComponentActivity
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.dropbox.dropshots.Dropshots
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppScreenshotTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @get:Rule
    val dropshots = Dropshots()

    @Test
    fun testAppScreenshot() {
        composeTestRule.setContent {
            // A simple component test to verify dropshots works
            Text("Hello Spresso!")
        }
        
        dropshots.assertSnapshot(
            composeTestRule.activity,
            name = "AppScreenshot_SimpleText"
        )
    }
}
