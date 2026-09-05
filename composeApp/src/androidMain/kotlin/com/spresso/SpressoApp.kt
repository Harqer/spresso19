package com.spresso

import android.app.Application
import android.util.Log
import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.meta.wearable.dat.core.Wearables

class SpressoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Firebase.appCheck.installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance(),
        )
        Wearables.initialize(this).onFailure { error, _ ->
            // DAT may be unavailable on devices without the Meta Wearables service.
            // Keep the app usable and let the wearable onboarding surface the error.
            Log.e(TAG, "Meta Wearables DAT initialization failed: ${error.description}")
        }
    }

    private companion object {
        const val TAG = "SpressoApp"
    }
}
