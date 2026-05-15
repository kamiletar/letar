/**
 * AssSubtitleDecoder — JNI обёртка для рендеринга ASS/SSA субтитров через libass
 *
 * Загружает ASS файл, рендерит кадры субтитров в Bitmap.
 * Автоматически масштабирует шрифты под плотность экрана.
 */
package com.letar.exoplayer.ass

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.util.Log
import androidx.annotation.Keep

@Keep
class AssSubtitleDecoder(
    private val width: Int = 1920,
    private val height: Int = 1080,
    private val fontDir: String? = null,
    /** Плотность экрана для автомасштабирования (density * 1.5 = scale) */
    private val screenDensity: Float = 2.0f
) {
    companion object {
        private const val TAG = "AssSubtitleDecoder"

        init {
            try {
                System.loadLibrary("ass-bridge")
                Log.i(TAG, "ass-bridge library loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load ass-bridge library", e)
            }
        }
    }

    private var isInitialized = false
    private var currentBitmap: Bitmap? = null
    private var lastRenderedTime: Long = -1
    private var contentHash: Int = 0

    // JNI методы
    private external fun nativeInit(width: Int, height: Int, fontDir: String?): Boolean
    private external fun nativeSetFrameSize(width: Int, height: Int)
    private external fun nativeSetFontScale(scale: Float)
    private external fun nativeLoadTrack(content: String): Boolean
    private external fun nativeRender(timeMs: Long, bitmap: Bitmap): Boolean
    private external fun nativeDestroy()

    /**
     * Инициализация декодера
     */
    @Synchronized
    fun initialize(): Boolean {
        if (isInitialized) return true

        isInitialized = nativeInit(width, height, fontDir)
        if (isInitialized) {
            currentBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

            // Небольшое увеличение для читаемости на мобильных
            val autoScale = 1.5f
            nativeSetFontScale(autoScale)
            Log.i(TAG, "Decoder initialized: ${width}x${height}, density=$screenDensity, fontScale=$autoScale")
        } else {
            Log.e(TAG, "Failed to initialize decoder")
        }

        return isInitialized
    }

    /**
     * Загрузка ASS/SSA контента
     */
    @Synchronized
    fun loadContent(content: String): Boolean {
        if (!initialize()) return false

        val newHash = content.hashCode()
        if (newHash == contentHash) {
            return true // Контент не изменился
        }

        val success = nativeLoadTrack(content)
        if (success) {
            contentHash = newHash
            lastRenderedTime = -1 // Сбрасываем кэш
            Log.i(TAG, "ASS content loaded (${content.length} chars)")
        } else {
            Log.e(TAG, "Failed to load ASS content")
        }

        return success
    }

    /**
     * Обновление размера кадра
     */
    @Synchronized
    fun setFrameSize(newWidth: Int, newHeight: Int) {
        if (!isInitialized) return
        if (newWidth == width && newHeight == height) return

        nativeSetFrameSize(newWidth, newHeight)

        currentBitmap?.recycle()
        currentBitmap = Bitmap.createBitmap(newWidth, newHeight, Bitmap.Config.ARGB_8888)
        lastRenderedTime = -1

        Log.i(TAG, "Frame size updated: ${newWidth}x${newHeight}")
    }

    /**
     * Установка масштаба шрифтов
     *
     * @param scale Множитель размера (1.0 = оригинал, 1.5 = 150%)
     */
    @Synchronized
    fun setFontScale(scale: Float) {
        if (!isInitialized) return
        nativeSetFontScale(scale)
        lastRenderedTime = -1 // Принудительный перерендер
        Log.i(TAG, "Font scale set to: $scale")
    }

    /**
     * Рендеринг кадра субтитров
     *
     * @param timeMs Время в миллисекундах
     * @return Bitmap с отрендеренными субтитрами или null если нет субтитров
     */
    @Synchronized
    fun renderFrame(timeMs: Long): Bitmap? {
        if (!isInitialized) return null

        val bitmap = currentBitmap ?: return null

        // Оптимизация: не рендерим тот же кадр дважды
        // (субтитры обычно меняются редко)
        val timeDiff = kotlin.math.abs(timeMs - lastRenderedTime)
        if (timeDiff < 16) { // ~60fps
            return bitmap
        }

        // Очищаем bitmap
        bitmap.eraseColor(Color.TRANSPARENT)

        // Рендерим
        val changed = nativeRender(timeMs, bitmap)
        lastRenderedTime = timeMs

        return if (changed) bitmap else bitmap
    }

    /**
     * Получение текущего bitmap (без рендеринга)
     */
    fun getCurrentBitmap(): Bitmap? = currentBitmap

    /**
     * Освобождение ресурсов
     */
    @Synchronized
    fun release() {
        if (isInitialized) {
            nativeDestroy()
            isInitialized = false
        }

        currentBitmap?.recycle()
        currentBitmap = null
        lastRenderedTime = -1
        contentHash = 0

        Log.i(TAG, "Decoder released")
    }

    protected fun finalize() {
        release()
    }
}
