package com.letar.animatrona.tv

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Держит экран включённым, пока приложение на переднем плане.
     *
     * TV-приложение просматривается с дивана — D-pad трогают редко, экранный скринсейвер
     * системы срабатывает посреди серии (был реальный баг, `WAKE_LOCK` в манифесте
     * объявлен, но ничего его не использовало). В отличие от мобильного (`useWakeLock` в
     * animatrona-mobile через TurboModule, включается только на время воспроизведения —
     * там есть батарея, которую жалко), TV всегда от розетки, поэтому флаг держим на весь
     * activity lifecycle, а не только на экране плеера — не нужен ни TurboModule, ни JS-мост.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "AnimatronaTV"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
