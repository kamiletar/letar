/**
 * SyncVideoViewManager — React Native View Manager для SyncVideoView
 *
 * Поддерживает как Fabric (New Architecture) через interop layer,
 * так и legacy Paper через ViewManager API.
 */
package com.letar.exoplayer.sync

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class SyncVideoViewManager : SimpleViewManager<SyncVideoView>() {

    companion object {
        const val REACT_CLASS = "SyncVideoView"

        // Команды
        const val COMMAND_SEEK = 1
        const val COMMAND_PLAY = 2
        const val COMMAND_PAUSE = 3
        const val COMMAND_SET_RESIZE_MODE = 4
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(context: ThemedReactContext): SyncVideoView {
        return SyncVideoView(context)
    }

    // ==================== Props ====================

    @ReactProp(name = "videoSource")
    fun setVideoSource(view: SyncVideoView, source: String?) {
        view.setVideoSource(source)
    }

    @ReactProp(name = "audioSource")
    fun setAudioSource(view: SyncVideoView, source: String?) {
        view.setAudioSource(source)
    }

    @ReactProp(name = "paused", defaultBoolean = true)
    fun setPaused(view: SyncVideoView, paused: Boolean) {
        view.setPaused(paused)
    }

    @ReactProp(name = "volume", defaultFloat = 1.0f)
    fun setVolume(view: SyncVideoView, volume: Float) {
        view.setVolume(volume)
    }

    @ReactProp(name = "muted", defaultBoolean = false)
    fun setMuted(view: SyncVideoView, muted: Boolean) {
        view.setMuted(muted)
    }

    @ReactProp(name = "resizeMode")
    fun setResizeMode(view: SyncVideoView, mode: String?) {
        view.setResizeMode(mode ?: "contain")
    }

    @ReactProp(name = "volumeBoost", defaultInt = 0)
    fun setVolumeBoost(view: SyncVideoView, boost: Int) {
        view.setVolumeBoost(boost)
    }

    @ReactProp(name = "rate", defaultFloat = 1.0f)
    fun setRate(view: SyncVideoView, rate: Float) {
        view.setPlaybackRate(rate)
    }

    // ==================== Commands ====================

    override fun getCommandsMap(): Map<String, Int> = mapOf(
        "seek" to COMMAND_SEEK,
        "play" to COMMAND_PLAY,
        "pause" to COMMAND_PAUSE,
        "setResizeMode" to COMMAND_SET_RESIZE_MODE
    )

    override fun receiveCommand(view: SyncVideoView, commandId: String, args: ReadableArray?) {
        when (commandId) {
            "seek" -> {
                val position = args?.getDouble(0)?.toFloat() ?: 0f
                view.seek(position)
            }
            "play" -> {
                view.play()
            }
            "pause" -> {
                view.pause()
            }
            "setResizeMode" -> {
                val mode = args?.getString(0) ?: "contain"
                view.setResizeMode(mode)
            }
        }
    }

    // Legacy fallback для Int commandId
    override fun receiveCommand(view: SyncVideoView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_SEEK -> {
                val position = args?.getDouble(0)?.toFloat() ?: 0f
                view.seek(position)
            }
            COMMAND_PLAY -> {
                view.play()
            }
            COMMAND_PAUSE -> {
                view.pause()
            }
            COMMAND_SET_RESIZE_MODE -> {
                val mode = args?.getString(0) ?: "contain"
                view.setResizeMode(mode)
            }
        }
    }

    // ==================== Events ====================

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return MapBuilder.builder<String, Any>()
            .put("onSyncVideoLoad", MapBuilder.of("registrationName", "onSyncVideoLoad"))
            .put("onSyncVideoProgress", MapBuilder.of("registrationName", "onSyncVideoProgress"))
            .put("onSyncVideoError", MapBuilder.of("registrationName", "onSyncVideoError"))
            .put("onSyncVideoEnd", MapBuilder.of("registrationName", "onSyncVideoEnd"))
            .put("onSyncVideoSeek", MapBuilder.of("registrationName", "onSyncVideoSeek"))
            .put("onSyncVideoTap", MapBuilder.of("registrationName", "onSyncVideoTap"))
            .build()
    }

    // ==================== Lifecycle ====================

    override fun onDropViewInstance(view: SyncVideoView) {
        view.release()
        super.onDropViewInstance(view)
    }
}
