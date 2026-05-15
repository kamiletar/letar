package com.lena.animatrona.mobile

import android.app.Activity
import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import android.util.Log
import android.util.Rational
import android.view.ViewGroup
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.lena.exoplayer.sync.SyncVideoView
import java.lang.ref.WeakReference

/**
 * TurboModule для Picture-in-Picture режима
 *
 * Требует Android 8.0+ (API 26+)
 * Поддерживает media actions (play/pause) в PiP окне
 */
class PipModule(reactContext: ReactApplicationContext) :
    NativePipModuleSpec(reactContext) {

    companion object {
        const val NAME = "PipModule"
        private const val ACTION_PLAY = "com.lena.animatrona.mobile.PIP_PLAY"
        private const val ACTION_PAUSE = "com.lena.animatrona.mobile.PIP_PAUSE"
    }

    /** Текущее состояние воспроизведения для обновления PiP actions */
    private var isPlaying = true

    /** Сохранённая ссылка на Activity для PiP режима (getCurrentActivity() возвращает null в PiP на Android < 12) */
    private var pipActivityRef: WeakReference<Activity>? = null

    /** BroadcastReceiver для обработки кнопок в PiP окне */
    private var pipReceiver: BroadcastReceiver? = null

    override fun getName(): String = NAME

    /** Получить Activity с fallback на сохранённую ссылку из PiP */
    private fun getActivity(): Activity? {
        return reactApplicationContext.getCurrentActivity() ?: pipActivityRef?.get()
    }

    override fun initialize() {
        super.initialize()
        registerPipReceiver()
    }

    override fun invalidate() {
        unregisterPipReceiver()
        super.invalidate()
    }

    /**
     * Регистрация BroadcastReceiver для media actions
     */
    private fun registerPipReceiver() {
        if (pipReceiver != null) return

        pipReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    ACTION_PLAY -> {
                        isPlaying = true
                        // Управляем ExoPlayer напрямую — Fabric не обновляет views в PiP (Activity PAUSED)
                        findSyncVideoView(getActivity())?.play()
                        sendPipActionEvent("play")
                        updatePipActions(getActivity())
                    }
                    ACTION_PAUSE -> {
                        isPlaying = false
                        findSyncVideoView(getActivity())?.pause()
                        sendPipActionEvent("pause")
                        updatePipActions(getActivity())
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(ACTION_PLAY)
            addAction(ACTION_PAUSE)
        }

        // RECEIVER_EXPORTED — PiP action broadcasts отправляются SystemUI (другой процесс),
        // RECEIVER_NOT_EXPORTED блокирует их на Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(pipReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            reactApplicationContext.registerReceiver(pipReceiver, filter)
        }
    }

    /**
     * Отписка BroadcastReceiver
     */
    private fun unregisterPipReceiver() {
        pipReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (_: Exception) {}
            pipReceiver = null
        }
    }

    /**
     * Проверить доступность PiP на устройстве
     */
    override fun isPipAvailable(promise: Promise) {
        val activity = reactApplicationContext.getCurrentActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }

        val isAvailable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
        } else {
            false
        }

        promise.resolve(isAvailable)
    }

    /**
     * Обновить состояние воспроизведения (для синхронизации кнопок PiP)
     */
    override fun updatePlaybackState(playing: Boolean) {
        isPlaying = playing
        updatePipActions(getActivity())
    }

    /**
     * Войти в PiP режим
     *
     * @param options - опции с aspectRatio { numerator, denominator }
     */
    override fun enterPictureInPictureMode(options: ReadableMap, promise: Promise) {
        val activity = reactApplicationContext.getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity is not available")
            return
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("NOT_SUPPORTED", "PiP requires Android 8.0+")
            return
        }

        try {
            // Сохраняем ссылку на Activity до входа в PiP (после входа getCurrentActivity() может вернуть null)
            pipActivityRef = WeakReference(activity)

            val aspectRatio = options.getMap("aspectRatio")
            val numerator = aspectRatio?.getInt("numerator") ?: 16
            val denominator = aspectRatio?.getInt("denominator") ?: 9

            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(numerator, denominator))
                .setActions(buildPipActions(activity))
                .build()

            val result = activity.enterPictureInPictureMode(params)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PIP_ERROR", e.message, e)
        }
    }

    /**
     * Выйти из PiP режима — перезапускаем Activity в полноэкранном режиме
     */
    override fun exitPictureInPictureMode(promise: Promise) {
        val activity = getActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }

        try {
            // Запуск Intent с REORDER_TO_FRONT выводит Activity из PiP в полный экран
            val intent = Intent(activity, activity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            activity.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("PipModule", "exitPictureInPictureMode failed", e)
            promise.reject("PIP_EXIT_ERROR", e.message, e)
        }
    }

    /** Обязательные методы для EventEmitter */
    override fun addListener(eventName: String) {
        // Управляется на нативной стороне
    }

    override fun removeListeners(count: Double) {
        // Управляется на нативной стороне
    }

    /**
     * Создать RemoteActions для PiP окна (play/pause)
     */
    private fun buildPipActions(activity: Activity): List<RemoteAction> {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return emptyList()
        }

        val actions = mutableListOf<RemoteAction>()

        val packageName = activity.packageName

        if (isPlaying) {
            val pauseIntent = PendingIntent.getBroadcast(
                activity,
                0,
                Intent(ACTION_PAUSE).setPackage(packageName),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            val pauseAction = RemoteAction(
                Icon.createWithResource(activity, android.R.drawable.ic_media_pause),
                "Пауза",
                "Поставить на паузу",
                pauseIntent
            )
            actions.add(pauseAction)
        } else {
            val playIntent = PendingIntent.getBroadcast(
                activity,
                1,
                Intent(ACTION_PLAY).setPackage(packageName),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            val playAction = RemoteAction(
                Icon.createWithResource(activity, android.R.drawable.ic_media_play),
                "Воспроизведение",
                "Продолжить воспроизведение",
                playIntent
            )
            actions.add(playAction)
        }

        return actions
    }

    /**
     * Обновить PiP actions (при смене play/pause)
     */
    private fun updatePipActions(activity: Activity?) {
        if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        try {
            val params = PictureInPictureParams.Builder()
                .setActions(buildPipActions(activity))
                .build()
            activity.setPictureInPictureParams(params)
        } catch (_: Exception) {
            // Activity может быть не в PiP режиме — игнорируем
        }
    }

    /**
     * Отправить событие изменения режима PiP
     */
    fun sendPipModeChangedEvent(isInPipMode: Boolean) {
        // Очищаем ссылку при выходе из PiP — Activity снова доступна через getCurrentActivity()
        if (!isInPipMode) {
            pipActivityRef = null
        }

        val params = Arguments.createMap().apply {
            putBoolean("isInPipMode", isInPipMode)
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onPictureInPictureModeChanged", params)
    }

    /**
     * Найти SyncVideoView в Activity view hierarchy для прямого управления ExoPlayer
     * (Fabric не обновляет native views когда Activity в PAUSED state — PiP на Android < 12)
     */
    private fun findSyncVideoView(activity: Activity?): SyncVideoView? {
        if (activity == null) return null
        val rootView = activity.window?.decorView as? ViewGroup ?: return null
        return findViewRecursive(rootView)
    }

    private fun findViewRecursive(viewGroup: ViewGroup): SyncVideoView? {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is SyncVideoView) return child
            if (child is ViewGroup) {
                val found = findViewRecursive(child)
                if (found != null) return found
            }
        }
        return null
    }

    /**
     * Отправить событие нажатия кнопки в PiP окне
     */
    private fun sendPipActionEvent(action: String) {
        val params = Arguments.createMap().apply {
            putString("action", action)
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onPipAction", params)
    }
}
