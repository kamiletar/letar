package com.letar.animatrona.mobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.letar.exoplayer.ass.AssPackage
import com.letar.exoplayer.sync.SyncPackage

class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                // ViewManager пакеты (через interop layer)
                add(AssPackage())
                add(SyncPackage())
                // TurboModules — единый пакет регистрации
                add(TurboModulesPackage())
            },
        )
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}
