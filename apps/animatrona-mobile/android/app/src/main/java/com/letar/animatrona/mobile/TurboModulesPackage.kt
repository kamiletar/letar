/**
 * Единый ReactPackage для регистрации всех TurboModules приложения.
 *
 * Codegen генерирует abstract spec классы, но регистрацию модулей
 * всё равно нужно делать через ReactPackage.
 */
package com.letar.animatrona.mobile

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TurboModulesPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            HapticsModule.NAME -> HapticsModule(reactContext)
            DownloadServiceModule.NAME -> DownloadServiceModule(reactContext)
            BrightnessModule.NAME -> BrightnessModule(reactContext)
            VolumeModule.NAME -> VolumeModule(reactContext)
            KeyEventModule.NAME -> KeyEventModule(reactContext)
            PipModule.NAME -> PipModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val modules = mutableMapOf<String, ReactModuleInfo>()

            val moduleNames = listOf(
                HapticsModule.NAME,
                DownloadServiceModule.NAME,
                BrightnessModule.NAME,
                VolumeModule.NAME,
                KeyEventModule.NAME,
                PipModule.NAME,
            )

            for (name in moduleNames) {
                modules[name] = ReactModuleInfo(
                    name,
                    name,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    false, // isCxxModule
                    true,  // isTurboModule
                )
            }

            modules
        }
    }
}
