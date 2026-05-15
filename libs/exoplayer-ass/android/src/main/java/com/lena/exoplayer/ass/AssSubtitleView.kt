/**
 * AssSubtitleView — Native View для отображения ASS субтитров в React Native
 */
package com.lena.exoplayer.ass

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.util.Log
import android.view.View

class AssSubtitleView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        private const val TAG = "AssSubtitleView"
    }

    private var decoder: AssSubtitleDecoder? = null
    private var currentTimeMs: Long = 0
    private var videoWidth: Int = 1920
    private var videoHeight: Int = 1080
    private var assContent: String = ""
    private var fontDir: String? = null

    private val paint = Paint().apply {
        isFilterBitmap = true
        isAntiAlias = true
    }

    private val matrix = Matrix()
    private val srcRect = RectF()
    private val dstRect = RectF()

    init {
        // Разрешаем отрисовку
        setWillNotDraw(false)
        // Аппаратное ускорение
        setLayerType(LAYER_TYPE_HARDWARE, null)
    }

    /**
     * Установка содержимого ASS файла
     */
    fun setAssContent(content: String) {
        if (content == assContent) return

        assContent = content

        if (content.isNotEmpty()) {
            ensureDecoder()
            decoder?.loadContent(content)
            invalidate()
        }
    }

    /**
     * Установка текущего времени
     */
    fun setCurrentTimeMs(timeMs: Long) {
        if (timeMs == currentTimeMs) return

        currentTimeMs = timeMs
        invalidate()
    }

    /**
     * Установка размеров видео
     */
    fun setVideoSize(width: Int, height: Int) {
        if (width == videoWidth && height == videoHeight) return

        videoWidth = width
        videoHeight = height
        decoder?.setFrameSize(width, height)
        invalidate()
    }

    /**
     * Установка директории шрифтов
     */
    fun setFontDir(dir: String?) {
        fontDir = dir
        // Пересоздаём декодер с новой директорией
        decoder?.release()
        decoder = null
        if (assContent.isNotEmpty()) {
            ensureDecoder()
            decoder?.loadContent(assContent)
            invalidate()
        }
    }

    private var viewWidth: Int = 0
    private var viewHeight: Int = 0

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w > 0 && h > 0 && (w != viewWidth || h != viewHeight)) {
            viewWidth = w
            viewHeight = h
            Log.i(TAG, "View size changed: ${w}x${h}")
            // Пересоздаём декодер с новыми размерами
            decoder?.release()
            decoder = null
            if (assContent.isNotEmpty()) {
                ensureDecoder()
                decoder?.loadContent(assContent)
            }
        }
    }

    private fun ensureDecoder() {
        if (decoder == null && viewWidth > 0 && viewHeight > 0) {
            // Используем реальные размеры view для рендеринга
            val density = context.resources.displayMetrics.density
            decoder = AssSubtitleDecoder(viewWidth, viewHeight, fontDir, density)
            Log.i(TAG, "Created decoder with view size: ${viewWidth}x${viewHeight}, density: $density")
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        if (assContent.isEmpty() || viewWidth == 0 || viewHeight == 0) return

        val dec = decoder ?: return
        val bitmap = dec.renderFrame(currentTimeMs) ?: return

        // Bitmap уже в размере view — рисуем напрямую
        canvas.drawBitmap(bitmap, 0f, 0f, paint)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        release()
    }

    /**
     * Установка масштаба шрифтов
     */
    fun setFontScale(scale: Float) {
        decoder?.setFontScale(scale)
        invalidate()
    }

    /**
     * Освобождение ресурсов
     */
    fun release() {
        decoder?.release()
        decoder = null
    }
}
