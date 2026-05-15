package com.lena.animatrona.mobile

import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Запрещаем восстановление фрагментов react-native-screens при рестарте процесса.
     * Без этого Android пытает восстановить ScreenStackFragment, что приводит к крашу.
     * См. https://github.com/software-mansion/react-native-screens/issues/17
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "AnimatronaMobile"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    /**
     * Перехват аппаратных кнопок (D-pad, media keys) для управления пультом
     *
     * Когда KeyEventModule.interceptEnabled = true (активен PlayerScreen),
     * D-pad и media кнопки перехватываются и отправляются в JS.
     * Когда false — стандартная фокус-навигация для других экранов.
     *
     * Кнопки громкости НЕ перехватываются — они обрабатываются системой.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Кнопки громкости и Назад передаём системе напрямую — в JS они не нужны.
        // Back обрабатывается React Navigation через BackHandler, а не через dispatchKeyEvent.
        if (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
            event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
            event.keyCode == KeyEvent.KEYCODE_VOLUME_MUTE ||
            event.keyCode == KeyEvent.KEYCODE_BACK) {
            return super.dispatchKeyEvent(event)
        }

        try {
            val keyEventModule = reactHost
                .currentReactContext
                ?.getNativeModule(KeyEventModule::class.java)

            // Отправляем событие в JS
            keyEventModule?.onKeyEvent(event.keyCode, event.action)

            // Перехватываем D-pad и media кнопки только когда плеер активен
            if (keyEventModule?.interceptEnabled == true) {
                return when (event.keyCode) {
                    KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
                    KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
                    KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER,
                    KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
                    KeyEvent.KEYCODE_MEDIA_REWIND, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> true
                    else -> super.dispatchKeyEvent(event)
                }
            }
        } catch (e: Throwable) {
            // React context может быть недоступен во время инициализации
        }

        return super.dispatchKeyEvent(event)
    }

    /**
     * Обработка смены PiP режима — отправляем событие в React Native
     */
    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val pipModule = reactHost
                    .currentReactContext
                    ?.getNativeModule(PipModule::class.java)

                pipModule?.sendPipModeChangedEvent(isInPictureInPictureMode)
            } catch (e: Throwable) {
                // React context может быть недоступен
            }
        }
    }
}
