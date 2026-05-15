package com.lena.animatrona.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Foreground Service для загрузок.
 *
 * Держит процесс живым при сворачивании приложения, чтобы загрузки
 * через react-native-blob-util не обрывались Android'ом.
 *
 * foregroundServiceType = dataSync (API 29+).
 * Notification channel с IMPORTANCE_LOW (без звука).
 */
class DownloadService : Service() {

    companion object {
        const val CHANNEL_ID = "animatrona_downloads"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "com.lena.animatrona.mobile.DOWNLOAD_START"
        const val ACTION_UPDATE = "com.lena.animatrona.mobile.DOWNLOAD_UPDATE"
        const val ACTION_STOP = "com.lena.animatrona.mobile.DOWNLOAD_STOP"

        const val EXTRA_TITLE = "title"
        const val EXTRA_PROGRESS = "progress"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Загрузка..."
                startForeground(NOTIFICATION_ID, buildNotification(title, 0))
            }
            ACTION_UPDATE -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Загрузка..."
                val progress = intent.getIntExtra(EXTRA_PROGRESS, 0)
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify(NOTIFICATION_ID, buildNotification(title, progress))
            }
            ACTION_STOP -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /** Создаём notification channel (API 26+) */
    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Загрузки",
            NotificationManager.IMPORTANCE_LOW // Без звука
        ).apply {
            description = "Прогресс загрузки эпизодов"
            setShowBadge(false)
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    /** Собрать notification с прогресс-баром */
    private fun buildNotification(title: String, progress: Int): Notification {
        // Тап по notification → открыть приложение
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(if (progress > 0) "$progress%" else "Подготовка...")
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setProgress(100, progress, progress == 0)
            .setContentIntent(pendingIntent)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }
}
