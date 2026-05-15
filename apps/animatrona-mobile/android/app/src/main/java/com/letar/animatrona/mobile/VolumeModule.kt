package com.letar.animatrona.mobile

import android.media.AudioManager
import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

/**
 * TurboModule для управления системной громкостью (медиа-поток)
 *
 * Использует AudioManager.STREAM_MUSIC для управления громкостью медиа.
 */
class VolumeModule(reactContext: ReactApplicationContext) :
    NativeVolumeModuleSpec(reactContext) {

    companion object {
        const val NAME = "VolumeModule"
        private const val TAG = "VolumeModule"
    }

    override fun getName(): String = NAME

    private fun getAudioManager(): AudioManager? {
        return reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    /**
     * Получить текущую громкость медиа (0.0-1.0)
     */
    override fun getVolume(promise: Promise) {
        try {
            val audioManager = getAudioManager()
            if (audioManager == null) {
                promise.reject("NO_AUDIO_MANAGER", "AudioManager not available")
                return
            }

            val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val volume = if (max > 0) current.toDouble() / max.toDouble() else 0.0

            promise.resolve(volume)
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message, e)
        }
    }

    /**
     * Установить громкость медиа
     *
     * @param value 0.0-1.0
     */
    override fun setVolume(value: Double, promise: Promise) {
        try {
            val audioManager = getAudioManager()
            if (audioManager == null) {
                promise.reject("NO_AUDIO_MANAGER", "AudioManager not available")
                return
            }

            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val clampedValue = value.coerceIn(0.0, 1.0)
            val volumeIndex = (clampedValue * max).toInt()

            Log.d(TAG, "setVolume: $clampedValue -> index $volumeIndex/$max")

            // FLAG_SHOW_UI = 0 чтобы не показывать системный UI громкости
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, volumeIndex, 0)

            promise.resolve(clampedValue)
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message, e)
        }
    }

    /**
     * Получить максимальное количество шагов громкости
     */
    override fun getMaxVolume(promise: Promise) {
        try {
            val audioManager = getAudioManager()
            if (audioManager == null) {
                promise.reject("NO_AUDIO_MANAGER", "AudioManager not available")
                return
            }

            promise.resolve(audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC).toDouble())
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message, e)
        }
    }
}
