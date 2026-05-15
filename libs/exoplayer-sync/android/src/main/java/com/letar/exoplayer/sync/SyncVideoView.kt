/**
 * SyncVideoView — Native View для синхронного воспроизведения видео + внешнего аудио
 *
 * Использует ExoPlayer с MergingMediaSource для объединения видео и аудио потоков
 * в единый MediaSource, обеспечивая атомарную синхронизацию на уровне фреймов.
 */
package com.letar.exoplayer.sync

import android.content.Context
import android.media.audiofx.LoudnessEnhancer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.util.Log
import android.view.MotionEvent
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.MergingMediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter

@OptIn(UnstableApi::class)
class SyncVideoView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    companion object {
        private const val TAG = "SyncVideoView"
        private const val VERSION = "0.8.1"
        private const val PROGRESS_UPDATE_INTERVAL_MS = 250L
    }

    private var exoPlayer: ExoPlayer? = null
    private val playerView: PlayerView
    private val dataSourceFactory: DefaultDataSource.Factory
    private val mainHandler = Handler(Looper.getMainLooper())

    // Источники медиа
    private var videoUri: Uri? = null
    private var audioUri: Uri? = null

    // Состояние воспроизведения
    private var isPaused: Boolean = true
    private var volume: Float = 1.0f
    private var isMuted: Boolean = false
    private var playbackSpeed: Float = 1.0f
    private var resizeMode: String = "contain"

    // Усиление громкости (LoudnessEnhancer)
    // volumeBoost: 0 = 100%, 100 = 200%
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var volumeBoost: Int = 0

    // Progress updates
    private val progressRunnable = object : Runnable {
        override fun run() {
            emitProgress()
            mainHandler.postDelayed(this, PROGRESS_UPDATE_INTERVAL_MS)
        }
    }
    private var isProgressUpdating = false

    init {
        // Создаём PlayerView
        playerView = PlayerView(context).apply {
            useController = false // Управление из React Native
            // Отключаем перехват тачей — передаём их React Native для GestureOverlay
            // Без этого PlayerView поглощает все touch события (возвращает true в onTouchEvent)
            // См. https://github.com/google/ExoPlayer/issues/6340
            isClickable = false
            isFocusable = false
            isFocusableInTouchMode = false
            isEnabled = false  // Полностью отключаем view для touch
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        }
        addView(playerView)

        // Контейнер (FrameLayout) должен получать touch события для onTouchEvent()
        // isClickable = true нужен чтобы onTouchEvent вызывался
        isClickable = true
        isFocusable = false
        isFocusableInTouchMode = false

        // Data source factory для загрузки медиа
        dataSourceFactory = DefaultDataSource.Factory(context)

        Log.d(TAG, "SyncVideoView v$VERSION initialized - native tap handling")
    }

    // ==================== Touch Handling ====================

    /**
     * Обрабатываем тапы и отправляем событие в React Native.
     * Это нужно потому что Android native view перехватывает тапы
     * до того как они доходят до React Native слоя.
     */
    override fun onTouchEvent(event: MotionEvent?): Boolean {
        if (event == null) return false

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                Log.d(TAG, "v$VERSION onTouchEvent ACTION_DOWN at (${event.x}, ${event.y})")
            }
            MotionEvent.ACTION_UP -> {
                Log.d(TAG, "v$VERSION onTouchEvent ACTION_UP - emitting onTap at (${event.x}, ${event.y})")
                emitTap(event.x, event.y)
            }
        }
        // Возвращаем true чтобы получать все события (DOWN, MOVE, UP)
        return true
    }

    /**
     * Не перехватываем touch события детей — но дети всё равно не обрабатывают.
     */
    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        return false
    }

    /**
     * Переопределяем requestDisallowInterceptTouchEvent чтобы дети
     * не могли блокировать передачу событий родителю.
     */
    override fun requestDisallowInterceptTouchEvent(disallowIntercept: Boolean) {
        // Игнорируем — всегда разрешаем родителю перехватывать
    }

    /**
     * Отправка события тапа в React Native
     */
    private fun emitTap(x: Float, y: Float) {
        Log.i(TAG, "v$VERSION emitTap: sending onSyncVideoTap event to RN at ($x, $y)")
        val params = Arguments.createMap().apply {
            putDouble("x", x.toDouble())
            putDouble("y", y.toDouble())
        }
        sendEvent("onSyncVideoTap", params)
        Log.i(TAG, "v$VERSION emitTap: event sent successfully")
    }

    // ==================== Media Sources ====================

    /**
     * Установка URI видео
     */
    fun setVideoSource(uri: String?) {
        Log.i(TAG, "setVideoSource: ${uri?.take(80)}")
        if (uri.isNullOrEmpty()) {
            Log.w(TAG, "setVideoSource: empty URI!")
            videoUri = null
            return
        }

        val newUri = Uri.parse(uri)
        if (newUri != videoUri) {
            videoUri = newUri
            Log.i(TAG, "setVideoSource: calling preparePlayer()")
            preparePlayer()
        } else {
            Log.i(TAG, "setVideoSource: URI unchanged, skipping")
        }
    }

    /**
     * Установка URI внешнего аудио
     */
    fun setAudioSource(uri: String?) {
        val newUri = if (uri.isNullOrEmpty()) null else Uri.parse(uri)
        if (newUri != audioUri) {
            // Сохраняем позицию до пересоздания плеера (при переключении озвучка/субтитры)
            val savedPosition = exoPlayer?.currentPosition ?: 0L
            audioUri = newUri
            preparePlayer()
            if (savedPosition > 0) {
                exoPlayer?.seekTo(savedPosition)
            }
        }
    }

    /**
     * Пауза/воспроизведение
     */
    fun setPaused(paused: Boolean) {
        isPaused = paused
        exoPlayer?.playWhenReady = !paused

        if (!paused && !isProgressUpdating) {
            startProgressUpdates()
        } else if (paused) {
            stopProgressUpdates()
        }
    }

    /**
     * Установка громкости (0.0 - 1.0)
     */
    fun setVolume(vol: Float) {
        volume = vol.coerceIn(0f, 1f)
        updateVolume()
    }

    /**
     * Отключение звука
     */
    fun setMuted(muted: Boolean) {
        isMuted = muted
        updateVolume()
    }

    /**
     * Усиление громкости выше 100%
     * @param boost значение от 0 до 100 (0 = 100%, 100 = 200%)
     */
    fun setVolumeBoost(boost: Int) {
        volumeBoost = boost.coerceIn(0, 100)
        updateLoudnessEnhancer()
    }

    /**
     * Скорость воспроизведения (0.25x - 4.0x)
     */
    fun setPlaybackRate(rate: Float) {
        playbackSpeed = rate.coerceIn(0.25f, 4.0f)
        exoPlayer?.setPlaybackSpeed(playbackSpeed)
        Log.d(TAG, "setPlaybackRate: $playbackSpeed")
    }

    /**
     * Режим масштабирования видео
     */
    fun setResizeMode(mode: String) {
        Log.i(TAG, "setResizeMode: $mode")
        resizeMode = mode
        val newMode = when (mode) {
            "cover" -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
            "stretch" -> AspectRatioFrameLayout.RESIZE_MODE_FILL
            else -> AspectRatioFrameLayout.RESIZE_MODE_FIT // contain
        }
        Log.i(TAG, "Setting playerView.resizeMode to: $newMode (FIT=0, FIXED_WIDTH=1, FIXED_HEIGHT=2, FILL=3, ZOOM=4)")
        playerView.resizeMode = newMode
    }

    /**
     * Seek на указанную позицию (в секундах)
     */
    fun seek(positionSeconds: Float) {
        val positionMs = (positionSeconds * 1000).toLong()
        exoPlayer?.seekTo(positionMs)

        // Emit seek event
        emitSeek(positionSeconds)
    }

    /**
     * Начать воспроизведение (команда из JS)
     */
    fun play() {
        setPaused(false)
    }

    /**
     * Приостановить воспроизведение (команда из JS)
     */
    fun pause() {
        setPaused(true)
    }

    /**
     * Подготовка плеера с MergingMediaSource
     */
    private fun preparePlayer() {
        val video = videoUri
        if (video == null) {
            Log.w(TAG, "preparePlayer: videoUri is null, aborting")
            return
        }

        Log.i(TAG, "preparePlayer: video=$video, audio=$audioUri, isPaused=$isPaused")

        // Освобождаем старый плеер
        releasePlayer()

        // Создаём ExoPlayer
        exoPlayer = ExoPlayer.Builder(context)
            .build()
            .apply {
                // Слушатель событий
                addListener(playerListener)

                // Настройки
                playWhenReady = !isPaused
            }

        // Привязываем к PlayerView
        playerView.player = exoPlayer

        // Создаём MediaSource
        val mediaSource = buildMediaSource(video)
        exoPlayer?.setMediaSource(mediaSource)
        exoPlayer?.prepare()

        // Применяем настройки
        updateVolume()
        setResizeMode(resizeMode)
        exoPlayer?.setPlaybackSpeed(playbackSpeed)

        if (!isPaused) {
            startProgressUpdates()
        }
    }

    /**
     * Создание MergingMediaSource для видео + аудио
     */
    private fun buildMediaSource(videoUri: Uri): MediaSource {
        val videoSource = ProgressiveMediaSource.Factory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(videoUri))

        val audio = audioUri
        if (audio == null) {
            Log.d(TAG, "No external audio, using video audio track")
            return videoSource
        }

        Log.d(TAG, "Creating MergingMediaSource with external audio: $audio")

        val audioSource = ProgressiveMediaSource.Factory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(audio))

        // MergingMediaSource объединяет потоки:
        // - adjustPeriodTimeOffsets: true — выравнивает таймстемпы
        // - clipDurations: true — обрезает по короткому потоку
        return MergingMediaSource(
            /* adjustPeriodTimeOffsets= */ true,
            /* clipDurations= */ true,
            videoSource,
            audioSource
        )
    }

    /**
     * Обновление громкости с учётом mute
     */
    private fun updateVolume() {
        exoPlayer?.volume = if (isMuted) 0f else volume
    }

    /**
     * Обновление LoudnessEnhancer для усиления громкости
     * Формула: +6dB = удвоение громкости (200%)
     * 600 mB (милибел) = +6 dB
     */
    private fun updateLoudnessEnhancer() {
        val player = exoPlayer ?: return
        val audioSessionId = player.audioSessionId

        if (audioSessionId == 0) {
            Log.w(TAG, "updateLoudnessEnhancer: audioSessionId is 0, skipping")
            return
        }

        try {
            // Создаём LoudnessEnhancer если ещё не создан
            if (loudnessEnhancer == null) {
                loudnessEnhancer = LoudnessEnhancer(audioSessionId)
                Log.i(TAG, "LoudnessEnhancer created for audioSessionId=$audioSessionId")
            }

            // Рассчитываем gain в милибелах
            // volumeBoost: 0 = 0mB (100%), 100 = 600mB (200%)
            val targetGainMb = (volumeBoost * 6).toInt() // 0-600 mB
            loudnessEnhancer?.setTargetGain(targetGainMb)
            loudnessEnhancer?.enabled = volumeBoost > 0

            Log.i(TAG, "LoudnessEnhancer: boost=$volumeBoost%, gain=${targetGainMb}mB, enabled=${volumeBoost > 0}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to setup LoudnessEnhancer", e)
        }
    }

    /**
     * Освобождение LoudnessEnhancer
     */
    private fun releaseLoudnessEnhancer() {
        loudnessEnhancer?.release()
        loudnessEnhancer = null
    }

    /**
     * Слушатель событий плеера
     */
    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) {
            val stateName = when (state) {
                Player.STATE_IDLE -> "IDLE"
                Player.STATE_BUFFERING -> "BUFFERING"
                Player.STATE_READY -> "READY"
                Player.STATE_ENDED -> "ENDED"
                else -> "UNKNOWN($state)"
            }
            Log.i(TAG, "onPlaybackStateChanged: $stateName")

            when (state) {
                Player.STATE_READY -> {
                    val player = exoPlayer
                    if (player != null) {
                        Log.i(TAG, "Player ready: duration=${player.duration}ms, " +
                            "size=${player.videoSize.width}x${player.videoSize.height}, " +
                            "playWhenReady=${player.playWhenReady}")
                    }
                    // Инициализируем LoudnessEnhancer когда audioSessionId доступен
                    updateLoudnessEnhancer()
                    emitLoad()
                }
                Player.STATE_ENDED -> {
                    emitEnd()
                    stopProgressUpdates()
                }
                Player.STATE_IDLE -> {
                    Log.w(TAG, "Player is IDLE - media not loaded")
                }
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            Log.e(TAG, "Player error: code=${error.errorCode}, message=${error.message}", error)
            emitError(error.errorCode.toString(), error.message ?: "Unknown error")
        }

        override fun onVideoSizeChanged(videoSize: androidx.media3.common.VideoSize) {
            Log.i(TAG, "Video size changed: ${videoSize.width}x${videoSize.height}")
        }

        override fun onRenderedFirstFrame() {
            Log.i(TAG, "First frame rendered!")
        }
    }

    // ==================== Events ====================

    /**
     * Отправка события в React Native
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        val reactContext = context as? ReactContext ?: return
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, eventName, params)
    }

    private fun emitLoad() {
        val player = exoPlayer ?: return
        val params = Arguments.createMap().apply {
            putDouble("duration", player.duration / 1000.0)
            putInt("naturalWidth", player.videoSize.width)
            putInt("naturalHeight", player.videoSize.height)
        }
        sendEvent("onSyncVideoLoad", params)
    }

    private fun emitProgress() {
        val player = exoPlayer ?: return
        val params = Arguments.createMap().apply {
            putDouble("currentTime", player.currentPosition / 1000.0)
            putDouble("playableDuration", player.bufferedPosition / 1000.0)
        }
        sendEvent("onSyncVideoProgress", params)
    }

    private fun emitError(code: String, message: String) {
        val params = Arguments.createMap().apply {
            putString("code", code)
            putString("message", message)
        }
        sendEvent("onSyncVideoError", params)
    }

    private fun emitEnd() {
        val params = Arguments.createMap()
        sendEvent("onSyncVideoEnd", params)
    }

    private fun emitSeek(seekTime: Float) {
        val player = exoPlayer ?: return
        val params = Arguments.createMap().apply {
            putDouble("currentTime", player.currentPosition / 1000.0)
            putDouble("seekTime", seekTime.toDouble())
        }
        sendEvent("onSyncVideoSeek", params)
    }

    // ==================== Progress Updates ====================

    private fun startProgressUpdates() {
        if (isProgressUpdating) return
        isProgressUpdating = true
        mainHandler.post(progressRunnable)
    }

    private fun stopProgressUpdates() {
        isProgressUpdating = false
        mainHandler.removeCallbacks(progressRunnable)
    }

    // ==================== Lifecycle ====================

    private fun releasePlayer() {
        stopProgressUpdates()
        releaseLoudnessEnhancer()
        exoPlayer?.apply {
            removeListener(playerListener)
            stop()
            release()
        }
        exoPlayer = null
        playerView.player = null
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        releasePlayer()
    }

    /**
     * Освобождение ресурсов (вызывается из ViewManager)
     */
    fun release() {
        releasePlayer()
    }
}
