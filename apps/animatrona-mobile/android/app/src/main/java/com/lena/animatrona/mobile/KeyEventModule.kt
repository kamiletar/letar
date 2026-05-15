package com.lena.animatrona.mobile

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * TurboModule для перехвата аппаратных кнопок (D-pad, media keys)
 *
 * Вызывается из MainActivity.dispatchKeyEvent() и отправляет события
 * в JS через RCTDeviceEventEmitter. Режим перехвата управляется
 * через setInterceptMode() — когда активен, D-pad не передаётся
 * в нативную фокус-систему.
 */
class KeyEventModule(reactContext: ReactApplicationContext) :
    NativeKeyEventModuleSpec(reactContext) {

    companion object {
        const val NAME = "KeyEventModule"
        private const val TAG = "KeyEventModule"
    }

    /** Флаг перехвата — когда true, D-pad кнопки не передаются в систему */
    var interceptEnabled: Boolean = false
        private set

    override fun getName(): String = NAME

    /**
     * Включить/выключить перехват D-pad кнопок
     *
     * PlayerScreen включает при монтировании, выключает при размонтировании.
     * Когда выключен — D-pad используется для нативной фокус-навигации.
     */
    override fun setInterceptMode(enabled: Boolean) {
        interceptEnabled = enabled
        Log.d(TAG, "setInterceptMode: $enabled")
    }

    /** Обязательные методы для EventEmitter */
    override fun addListener(eventName: String) {
        // Управляется на нативной стороне
    }

    override fun removeListeners(count: Double) {
        // Управляется на нативной стороне
    }

    /**
     * Вызывается из MainActivity.dispatchKeyEvent()
     *
     * @param keyCode Android KeyEvent keyCode
     * @param action 0 = ACTION_DOWN, 1 = ACTION_UP
     */
    fun onKeyEvent(keyCode: Int, action: Int) {
        val params = Arguments.createMap().apply {
            putInt("keyCode", keyCode)
            putInt("action", action)
        }
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onKeyEvent", params)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit key event: ${e.message}")
        }
    }
}
