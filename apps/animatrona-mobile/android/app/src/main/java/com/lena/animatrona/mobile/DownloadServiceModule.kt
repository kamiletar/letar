package com.lena.animatrona.mobile

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext

/**
 * TurboModule для управления DownloadService из JS.
 *
 * Методы:
 * - startService(title) — запустить foreground service
 * - updateProgress(title, progress) — обновить прогресс в notification
 * - stopService() — остановить service
 */
class DownloadServiceModule(reactContext: ReactApplicationContext) :
    NativeDownloadServiceModuleSpec(reactContext) {

    override fun getName(): String = NAME

    companion object {
        const val NAME = "DownloadServiceModule"
    }

    override fun startService(title: String) {
        val intent = Intent(reactApplicationContext, DownloadService::class.java).apply {
            action = DownloadService.ACTION_START
            putExtra(DownloadService.EXTRA_TITLE, title)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    override fun updateProgress(title: String, progress: Double) {
        val intent = Intent(reactApplicationContext, DownloadService::class.java).apply {
            action = DownloadService.ACTION_UPDATE
            putExtra(DownloadService.EXTRA_TITLE, title)
            putExtra(DownloadService.EXTRA_PROGRESS, progress.toInt())
        }
        reactApplicationContext.startService(intent)
    }

    override fun stopService() {
        val intent = Intent(reactApplicationContext, DownloadService::class.java).apply {
            action = DownloadService.ACTION_STOP
        }
        reactApplicationContext.startService(intent)
    }
}
