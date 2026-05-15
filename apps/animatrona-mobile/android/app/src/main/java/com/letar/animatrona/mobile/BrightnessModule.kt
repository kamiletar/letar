package com.letar.animatrona.mobile

import android.util.Log
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

/**
 * TurboModule для управления яркостью окна приложения
 *
 * Использует WindowManager.LayoutParams.screenBrightness,
 * что не требует системных разрешений — управляет только яркостью текущего окна.
 */
class BrightnessModule(reactContext: ReactApplicationContext) :
    NativeBrightnessModuleSpec(reactContext) {

    companion object {
        const val NAME = "BrightnessModule"
        private const val TAG = "BrightnessModule"
    }

    override fun getName(): String = NAME

    /**
     * Получить текущую яркость окна
     *
     * @return значение 0.0-1.0, или -1 если используется системная яркость
     */
    override fun getBrightness(promise: Promise) {
        val activity = reactApplicationContext.getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity is not available")
            return
        }

        try {
            val brightness = activity.window.attributes.screenBrightness
            // -1 означает системную яркость — вернём текущую системную
            if (brightness < 0) {
                val systemBrightness = android.provider.Settings.System.getInt(
                    activity.contentResolver,
                    android.provider.Settings.System.SCREEN_BRIGHTNESS,
                    128
                ) / 255f
                promise.resolve(systemBrightness.toDouble())
            } else {
                promise.resolve(brightness.toDouble())
            }
        } catch (e: Exception) {
            promise.reject("BRIGHTNESS_ERROR", e.message, e)
        }
    }

    /**
     * Установить яркость окна
     *
     * @param value 0.01-1.0 (0 = минимум, 1 = максимум)
     */
    override fun setBrightness(value: Double, promise: Promise) {
        val activity = reactApplicationContext.getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity is not available")
            return
        }

        try {
            val clampedValue = value.coerceIn(0.01, 1.0).toFloat()
            Log.d(TAG, "setBrightness: $clampedValue")

            // Обязательно на UI потоке — меняем атрибуты окна
            activity.runOnUiThread {
                val layoutParams = activity.window.attributes
                layoutParams.screenBrightness = clampedValue
                activity.window.attributes = layoutParams
            }

            promise.resolve(clampedValue.toDouble())
        } catch (e: Exception) {
            promise.reject("BRIGHTNESS_ERROR", e.message, e)
        }
    }

    /**
     * Предотвратить засыпание экрана (FLAG_KEEP_SCREEN_ON)
     *
     * @param enabled true — не гасить экран, false — снять флаг
     */
    override fun setKeepScreenOn(enabled: Boolean, promise: Promise) {
        val activity = reactApplicationContext.getCurrentActivity() ?: run {
            promise.reject("NO_ACTIVITY", "Activity is not available")
            return
        }
        try {
            activity.runOnUiThread {
                if (enabled) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
            Log.d(TAG, "setKeepScreenOn: $enabled")
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("WAKE_LOCK_ERROR", e.message, e)
        }
    }

    /**
     * Восстановить системную яркость (сбросить переопределение окна)
     */
    override fun restoreSystemBrightness(promise: Promise) {
        val activity = reactApplicationContext.getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity is not available")
            return
        }

        try {
            Log.d(TAG, "restoreSystemBrightness")

            activity.runOnUiThread {
                val layoutParams = activity.window.attributes
                layoutParams.screenBrightness = -1f // -1 = системная яркость
                activity.window.attributes = layoutParams
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BRIGHTNESS_ERROR", e.message, e)
        }
    }
}
