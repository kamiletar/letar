/**
 * AssSubtitleViewManager — React Native View Manager для AssSubtitleView
 *
 * Поддерживает как Fabric (New Architecture) через interop layer,
 * так и legacy Paper через ViewManager API.
 */
package com.letar.exoplayer.ass

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class AssSubtitleViewManager : SimpleViewManager<AssSubtitleView>() {

    companion object {
        const val REACT_CLASS = "AssSubtitleView"

        // Команды
        const val COMMAND_LOAD_CONTENT = 1
        const val COMMAND_SET_FRAME_SIZE = 2
        const val COMMAND_RELEASE = 3
        const val COMMAND_SET_FONT_SCALE = 4
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(context: ThemedReactContext): AssSubtitleView {
        return AssSubtitleView(context)
    }

    @ReactProp(name = "assContent")
    fun setAssContent(view: AssSubtitleView, content: String?) {
        view.setAssContent(content ?: "")
    }

    @ReactProp(name = "currentTimeMs")
    fun setCurrentTimeMs(view: AssSubtitleView, timeMs: Double) {
        view.setCurrentTimeMs(timeMs.toLong())
    }

    @ReactProp(name = "videoWidth", defaultInt = 1920)
    fun setVideoWidth(view: AssSubtitleView, width: Int) {
        // Сохраняем и обновляем при изменении height
    }

    @ReactProp(name = "videoHeight", defaultInt = 1080)
    fun setVideoHeight(view: AssSubtitleView, height: Int) {
        // TODO: сохранить width из предыдущего вызова
        // view.setVideoSize(width, height)
    }

    @ReactProp(name = "fontDir")
    fun setFontDir(view: AssSubtitleView, fontDir: String?) {
        view.setFontDir(fontDir)
    }

    override fun getCommandsMap(): Map<String, Int> = mapOf(
        "loadContent" to COMMAND_LOAD_CONTENT,
        "setFrameSize" to COMMAND_SET_FRAME_SIZE,
        "release" to COMMAND_RELEASE,
        "setFontScale" to COMMAND_SET_FONT_SCALE
    )

    override fun receiveCommand(view: AssSubtitleView, commandId: String, args: ReadableArray?) {
        when (commandId) {
            "loadContent" -> {
                val content = args?.getString(0) ?: ""
                view.setAssContent(content)
            }
            "setFrameSize" -> {
                val width = args?.getInt(0) ?: 1920
                val height = args?.getInt(1) ?: 1080
                view.setVideoSize(width, height)
            }
            "release" -> {
                view.release()
            }
            "setFontScale" -> {
                val scale = args?.getDouble(0)?.toFloat() ?: 1.0f
                view.setFontScale(scale)
            }
        }
    }

    // Legacy fallback для Int commandId
    override fun receiveCommand(view: AssSubtitleView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_LOAD_CONTENT -> {
                val content = args?.getString(0) ?: ""
                view.setAssContent(content)
            }
            COMMAND_SET_FRAME_SIZE -> {
                val width = args?.getInt(0) ?: 1920
                val height = args?.getInt(1) ?: 1080
                view.setVideoSize(width, height)
            }
            COMMAND_RELEASE -> {
                view.release()
            }
            COMMAND_SET_FONT_SCALE -> {
                val scale = args?.getDouble(0)?.toFloat() ?: 1.0f
                view.setFontScale(scale)
            }
        }
    }

    override fun onDropViewInstance(view: AssSubtitleView) {
        view.release()
        super.onDropViewInstance(view)
    }
}
