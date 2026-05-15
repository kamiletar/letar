package com.letar.animatrona.mobile

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.ReactApplicationContext

/**
 * TurboModule тактильной обратной связи
 *
 * Использует VibrationEffect API для надёжной работы на Android 12+.
 * Маппинг:
 * - light()  → короткий клик (EFFECT_CLICK)
 * - medium() → двойной клик (EFFECT_DOUBLE_CLICK)
 * - heavy()  → тяжёлый клик (EFFECT_HEAVY_CLICK)
 */
class HapticsModule(reactContext: ReactApplicationContext) :
    NativeHapticsModuleSpec(reactContext) {

    override fun getName(): String = NAME

    companion object {
        const val NAME = "HapticsModule"
    }

    private fun getVibrator(): Vibrator? {
        val context = reactApplicationContext
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    override fun light() {
        getVibrator()?.vibrate(
            VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
        )
    }

    override fun medium() {
        getVibrator()?.vibrate(
            VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
        )
    }

    override fun heavy() {
        getVibrator()?.vibrate(
            VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
        )
    }
}
