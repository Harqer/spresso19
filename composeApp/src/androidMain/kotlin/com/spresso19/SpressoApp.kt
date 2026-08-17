package com.spresso19

import android.app.Application

class SpressoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        com.meta.wearable.dat.core.Wearables.initialize(this)
    }
}
